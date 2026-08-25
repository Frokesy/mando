import { and, asc, eq, isNull, lte } from 'drizzle-orm'
import webpush from 'web-push'

import { database } from '../db/client.js'
import { notifications, pushDeliveries, pushSubscriptions } from '../db/schema.js'

let configured = false

export function getPushPublicKey() {
  return process.env.VAPID_PUBLIC_KEY || null
}

export async function deliverPendingPushNotifications() {
  if (!configureWebPush()) return

  const candidates = await database
    .select({
      notificationId: notifications.id,
      title: notifications.title,
      body: notifications.body,
      data: notifications.data,
      subscriptionId: pushSubscriptions.id,
      endpoint: pushSubscriptions.endpoint,
      p256dh: pushSubscriptions.p256dh,
      auth: pushSubscriptions.auth,
      role: pushSubscriptions.role,
    })
    .from(notifications)
    .innerJoin(pushSubscriptions, and(
      eq(pushSubscriptions.userId, notifications.userId),
      lte(pushSubscriptions.createdAt, notifications.createdAt),
    ))
    .leftJoin(pushDeliveries, and(
      eq(pushDeliveries.notificationId, notifications.id),
      eq(pushDeliveries.subscriptionId, pushSubscriptions.id),
    ))
    .where(isNull(pushDeliveries.notificationId))
    .orderBy(asc(notifications.createdAt))
    .limit(100)

  for (const candidate of candidates) {
    const [claim] = await database.insert(pushDeliveries).values({
      notificationId: candidate.notificationId,
      subscriptionId: candidate.subscriptionId,
    }).onConflictDoNothing().returning({ notificationId: pushDeliveries.notificationId })
    if (!claim) continue

    try {
      const data = (candidate.data ?? {}) as Record<string, unknown>
      await webpush.sendNotification({
        endpoint: candidate.endpoint,
        keys: { p256dh: candidate.p256dh, auth: candidate.auth },
      }, JSON.stringify({
        title: candidate.title,
        body: candidate.body,
        url: typeof data.url === 'string' ? data.url : notificationUrl(candidate.role),
        notificationId: candidate.notificationId,
      }))
      await database.update(pushDeliveries).set({ deliveredAt: new Date(), error: null }).where(and(
        eq(pushDeliveries.notificationId, candidate.notificationId),
        eq(pushDeliveries.subscriptionId, candidate.subscriptionId),
      ))
    } catch (error) {
      const statusCode = typeof error === 'object' && error && 'statusCode' in error
        ? Number(error.statusCode)
        : null
      if (statusCode === 400 || statusCode === 401 || statusCode === 403 || statusCode === 404 || statusCode === 410) {
        await database.delete(pushSubscriptions).where(eq(pushSubscriptions.id, candidate.subscriptionId))
      } else if (statusCode && statusCode >= 500) {
        await database.delete(pushDeliveries).where(and(
          eq(pushDeliveries.notificationId, candidate.notificationId),
          eq(pushDeliveries.subscriptionId, candidate.subscriptionId),
        ))
      } else {
        await database.update(pushDeliveries).set({ error: error instanceof Error ? error.message : 'Push delivery failed' }).where(and(
          eq(pushDeliveries.notificationId, candidate.notificationId),
          eq(pushDeliveries.subscriptionId, candidate.subscriptionId),
        ))
      }
    }
  }
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
