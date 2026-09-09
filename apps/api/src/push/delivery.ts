import { and, asc, eq, isNull, lte, or, sql } from 'drizzle-orm'
import webpush from 'web-push'

import { database } from '../db/client.js'
import { notificationPreferences, notifications, pushDeliveries, pushSubscriptions } from '../db/schema.js'
import {
  isCriticalNotification,
  isLagosQuietTime,
  mergeCategoryPreferences,
  notificationAllowed,
} from '../notifications/preferences.js'
import { pushFailureDecision, pushResponseStatus, safePushFailureReason } from './retry-policy.js'

let configured = false

type DeliveryLogger = {
  info?: (details: object, message: string) => void
  warn?: (details: object, message: string) => void
  error?: (details: object, message: string) => void
}

type DeliverySummary = {
  processed: number
  delivered: number
  retrying: number
  failed: number
  invalidSubscriptions: number
  suppressed: number
  processingErrors: number
}

export function getPushPublicKey() {
  return process.env.VAPID_PUBLIC_KEY || null
}

export async function deliverPendingPushNotifications(logger?: DeliveryLogger): Promise<DeliverySummary> {
  const summary: DeliverySummary = { processed: 0, delivered: 0, retrying: 0, failed: 0, invalidSubscriptions: 0, suppressed: 0, processingErrors: 0 }
  if (!configureWebPush()) {
    logger?.warn?.({ event: 'push_delivery_skipped', reason: 'vapid_not_configured' }, 'Push delivery skipped')
    return summary
  }

  const now = new Date()
  const staleClaimBefore = new Date(now.getTime() - 5 * 60_000)
  const candidates = await database
    .select({
      deliveryId: pushDeliveries.id,
      deliveryStatus: pushDeliveries.status,
      attemptCount: pushDeliveries.attemptCount,
      notificationId: notifications.id,
      type: notifications.type,
      title: notifications.title,
      body: notifications.body,
      data: notifications.data,
      subscriptionId: pushSubscriptions.id,
      endpoint: pushSubscriptions.endpoint,
      p256dh: pushSubscriptions.p256dh,
      auth: pushSubscriptions.auth,
      role: pushSubscriptions.role,
      pushEnabled: notificationPreferences.pushEnabled,
      categories: notificationPreferences.categories,
      quietHoursEnabled: notificationPreferences.quietHoursEnabled,
      quietHoursStart: notificationPreferences.quietHoursStart,
      quietHoursEnd: notificationPreferences.quietHoursEnd,
    })
    .from(notifications)
    .innerJoin(pushSubscriptions, and(
      eq(pushSubscriptions.userId, notifications.userId),
      eq(pushSubscriptions.role, notifications.targetRole),
      lte(pushSubscriptions.createdAt, notifications.createdAt),
    ))
    .leftJoin(pushDeliveries, and(
      eq(pushDeliveries.notificationId, notifications.id),
      eq(pushDeliveries.subscriptionId, pushSubscriptions.id),
    ))
    .leftJoin(notificationPreferences, and(
      eq(notificationPreferences.userId, notifications.userId),
      eq(notificationPreferences.role, notifications.targetRole),
    ))
    .where(or(
      isNull(pushDeliveries.id),
      and(eq(pushDeliveries.status, 'retrying'), lte(pushDeliveries.nextAttemptAt, now)),
      and(eq(pushDeliveries.status, 'processing'), lte(pushDeliveries.attemptedAt, staleClaimBefore)),
    ))
    .orderBy(asc(notifications.createdAt))
    .limit(100)

  for (const candidate of candidates) {
    try {
      const preferences = {
        pushEnabled: candidate.pushEnabled ?? true,
        inAppEnabled: true,
        categories: mergeCategoryPreferences(candidate.categories),
        quietHoursEnabled: candidate.quietHoursEnabled ?? false,
        quietHoursStart: candidate.quietHoursStart ?? '22:00',
        quietHoursEnd: candidate.quietHoursEnd ?? '07:00',
      }
      if (!isCriticalNotification(candidate.type) && isLagosQuietTime(now, preferences.quietHoursEnabled, preferences.quietHoursStart, preferences.quietHoursEnd)) continue

      const [claim] = candidate.deliveryId
        ? await database.update(pushDeliveries).set({
          status: 'processing',
          attemptCount: sql`${pushDeliveries.attemptCount} + 1`,
          attemptedAt: now,
          nextAttemptAt: null,
        }).where(and(
          eq(pushDeliveries.id, candidate.deliveryId),
          or(
            and(eq(pushDeliveries.status, 'retrying'), lte(pushDeliveries.nextAttemptAt, now)),
            and(eq(pushDeliveries.status, 'processing'), lte(pushDeliveries.attemptedAt, staleClaimBefore)),
          ),
        )).returning({ id: pushDeliveries.id, attemptCount: pushDeliveries.attemptCount })
        : await database.insert(pushDeliveries).values({
          notificationId: candidate.notificationId,
          subscriptionId: candidate.subscriptionId,
          status: 'processing',
          attemptCount: 1,
          attemptedAt: now,
        }).onConflictDoNothing().returning({ id: pushDeliveries.id, attemptCount: pushDeliveries.attemptCount })
      if (!claim) continue
      summary.processed += 1

      if (!notificationAllowed(candidate.type, 'push', preferences)) {
        await database.update(pushDeliveries).set({ status: 'suppressed', error: 'suppressed_by_preferences', failureReason: 'suppressed_by_preferences' }).where(eq(pushDeliveries.id, claim.id))
        summary.suppressed += 1
        continue
      }

      try {
        const data = (candidate.data ?? {}) as Record<string, unknown>
        await webpush.sendNotification({ endpoint: candidate.endpoint, keys: { p256dh: candidate.p256dh, auth: candidate.auth } }, JSON.stringify({
          title: candidate.title,
          body: candidate.body,
          url: typeof data.url === 'string' ? data.url : notificationUrl(candidate.role),
          notificationId: candidate.notificationId,
        }))
        await database.update(pushDeliveries).set({ status: 'delivered', deliveredAt: new Date(), failedAt: null, nextAttemptAt: null, responseStatus: null, failureReason: null, error: null }).where(eq(pushDeliveries.id, claim.id))
        summary.delivered += 1
      } catch (error) {
        const responseStatus = pushResponseStatus(error)
        const failureReason = safePushFailureReason(error)
        const decision = pushFailureDecision(claim.attemptCount, responseStatus, new Date())
        await database.update(pushDeliveries).set({
          status: decision.status,
          nextAttemptAt: decision.retryAt,
          failedAt: decision.status === 'retrying' ? null : new Date(),
          responseStatus,
          failureReason,
          error: failureReason,
        }).where(eq(pushDeliveries.id, claim.id))

        if (decision.status === 'invalid_subscription') {
          await database.delete(pushSubscriptions).where(eq(pushSubscriptions.id, candidate.subscriptionId))
          summary.invalidSubscriptions += 1
        } else if (decision.status === 'retrying') {
          summary.retrying += 1
        } else {
          summary.failed += 1
        }
        logger?.warn?.({ event: 'push_delivery_failed', notificationId: candidate.notificationId, deliveryId: claim.id, attemptCount: claim.attemptCount, responseStatus, status: decision.status, failureReason }, 'Push delivery attempt failed')
      }
    } catch (error) {
      summary.processingErrors += 1
      logger?.error?.({ event: 'push_delivery_processing_error', notificationId: candidate.notificationId, error: safePushFailureReason(error) }, 'Push candidate processing failed')
    }
  }

  const failureTotal = summary.retrying + summary.failed + summary.invalidSubscriptions + summary.processingErrors
  const elevated = failureTotal >= 5 && failureTotal / Math.max(1, summary.processed) >= 0.25
  const logDetails = { event: 'push_delivery_cycle_completed', ...summary, elevatedFailureRate: elevated }
  if (elevated) logger?.error?.(logDetails, 'Elevated push delivery failure rate')
  else logger?.info?.(logDetails, 'Push delivery cycle completed')
  return summary
}

function configureWebPush() {
  if (configured) return true
  const publicKey = process.env.VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT
  if (!publicKey || !privateKey || !subject) return false
  webpush.setVapidDetails(subject, publicKey, privateKey)
  configured = true
  return true
}

function notificationUrl(role: (typeof pushSubscriptions.$inferSelect)['role']) {
  if (role === 'sales_agent') return '/sales-agent/notifications'
  if (role === 'admin') return '/admin/dashboard/overview'
  return `/${role}/notifications`
}
