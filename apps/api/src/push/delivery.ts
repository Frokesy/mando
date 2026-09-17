import { and, asc, eq, inArray, isNull, lte, or, sql } from 'drizzle-orm'
import webpush from 'web-push'

import { database } from '../db/client.js'
import { notificationPreferences, notifications, pushDeliveries, pushSubscriptions, userRoles, users } from '../db/schema.js'
import {
  isCriticalNotification,
  isLagosQuietTime,
  mergeCategoryPreferences,
  notificationAllowed,
} from '../notifications/preferences.js'
import { pushFailureDecision, pushResponseStatus, safePushFailureReason } from './retry-policy.js'
import { safeNotificationUrl } from '../notifications/links.js'
import { notificationPresentation } from '../notifications/presentation.js'
import { pushMessagePolicy } from './message-policy.js'

let configured = false
let activeCycle: Promise<DeliverySummary> | undefined

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
  expired: number
}

export function getPushPublicKey() {
  return process.env.VAPID_PUBLIC_KEY || null
}

export function deliverPendingPushNotifications(logger?: DeliveryLogger): Promise<DeliverySummary> {
  if (activeCycle) return activeCycle
  activeCycle = runDeliveryCycle(logger).finally(() => { activeCycle = undefined })
  return activeCycle
}

async function runDeliveryCycle(logger?: DeliveryLogger): Promise<DeliverySummary> {
  const summary: DeliverySummary = { processed: 0, delivered: 0, retrying: 0, failed: 0, invalidSubscriptions: 0, suppressed: 0, processingErrors: 0, expired: 0 }
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
      createdAt: notifications.createdAt,
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
    .innerJoin(users, and(eq(users.id, notifications.userId), inArray(users.status, ['active', 'pending'])))
    .innerJoin(userRoles, and(eq(userRoles.userId, notifications.userId), eq(userRoles.role, notifications.targetRole)))
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

  // Bounded parallelism keeps a slow push provider from blocking every role.
  for (let offset = 0; offset < candidates.length; offset += 10) {
    await Promise.all(candidates.slice(offset, offset + 10).map(async (candidate) => {
    try {
      const preferences = {
        pushEnabled: candidate.pushEnabled ?? true,
        inAppEnabled: true,
        categories: mergeCategoryPreferences(candidate.categories),
        quietHoursEnabled: candidate.quietHoursEnabled ?? false,
        quietHoursStart: candidate.quietHoursStart ?? '22:00',
        quietHoursEnd: candidate.quietHoursEnd ?? '07:00',
      }
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
      if (!claim) return
      summary.processed += 1

      const policy = pushMessagePolicy(candidate.type, candidate.createdAt, new Date(), candidate.role)
      if (policy.ttl === 0) {
        await database.update(pushDeliveries).set({ status: 'expired', nextAttemptAt: null, failureReason: 'message_expired', error: 'message_expired' }).where(eq(pushDeliveries.id, claim.id))
        summary.expired += 1
        return
      }

      if (!isCriticalNotification(candidate.type) && isLagosQuietTime(now, preferences.quietHoursEnabled, preferences.quietHoursStart, preferences.quietHoursEnd)) {
        await database.update(pushDeliveries).set({
          status: 'retrying', nextAttemptAt: new Date(now.getTime() + 15 * 60_000),
          attemptCount: claim.attemptCount - 1, failureReason: 'quiet_hours',
        }).where(eq(pushDeliveries.id, claim.id))
        return
      }

      if (!notificationAllowed(candidate.type, 'push', preferences)) {
        await database.update(pushDeliveries).set({ status: 'suppressed', error: 'suppressed_by_preferences', failureReason: 'suppressed_by_preferences' }).where(eq(pushDeliveries.id, claim.id))
        summary.suppressed += 1
        return
      }

      try {
        const data = (candidate.data ?? {}) as Record<string, unknown>
        const presentation = notificationPresentation(candidate.type, candidate.title, candidate.body)
        await webpush.sendNotification({ endpoint: candidate.endpoint, keys: { p256dh: candidate.p256dh, auth: candidate.auth } }, JSON.stringify({
          title: presentation.title,
          body: presentation.body,
          url: safeNotificationUrl(candidate.role, data.url),
          notificationId: candidate.notificationId,
          category: presentation.category,
          icon: presentation.icon,
          badge: presentation.badge,
          role: candidate.role,
          expiresAt: policy.expiresAt.toISOString(),
        }), { TTL: policy.ttl, urgency: policy.urgency, topic: policy.topic, timeout: 10_000 })
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
          await database.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, candidate.endpoint))
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
    }))
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
