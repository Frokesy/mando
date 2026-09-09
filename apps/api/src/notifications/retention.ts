import { and, inArray, isNotNull, isNull, lt, or, sql } from 'drizzle-orm'

import { database } from '../db/client.js'
import { notifications, pushDeliveries } from '../db/schema.js'
import { READ_NOTIFICATION_RETENTION_DAYS, UNREAD_NOTIFICATION_RETENTION_DAYS } from './retention-policy.js'

const CLEANUP_LOCK = 'mando:notification-retention-cleanup'

export async function cleanupExpiredNotifications(now = new Date(), batchSize = 1_000) {
  const readCutoff = new Date(now.getTime() - READ_NOTIFICATION_RETENTION_DAYS * 86_400_000)
  const unreadCutoff = new Date(now.getTime() - UNREAD_NOTIFICATION_RETENTION_DAYS * 86_400_000)

  return database.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${CLEANUP_LOCK}))`)
    const expired = await tx.select({ id: notifications.id }).from(notifications).where(or(
      and(isNotNull(notifications.readAt), lt(notifications.createdAt, readCutoff)),
      and(isNull(notifications.readAt), lt(notifications.createdAt, unreadCutoff)),
    )).orderBy(notifications.createdAt).limit(Math.max(1, Math.min(batchSize, 5_000)))

    const ids = expired.map((row) => row.id)
    if (!ids.length) return { notificationsDeleted: 0, deliveryAttemptsDeleted: 0 }

    const [deliveryCount] = await tx.select({ count: sql<number>`count(*)::int` }).from(pushDeliveries).where(inArray(pushDeliveries.notificationId, ids))
    await tx.delete(notifications).where(inArray(notifications.id, ids))
    return { notificationsDeleted: ids.length, deliveryAttemptsDeleted: deliveryCount?.count ?? 0 }
  })
}
