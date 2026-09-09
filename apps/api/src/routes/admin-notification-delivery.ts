import type { FastifyInstance, FastifyReply } from 'fastify'
import { and, desc, eq, gte, isNotNull, sql } from 'drizzle-orm'
import { z } from 'zod'

import { getCurrentSessionContext } from '../auth/current-session.js'
import { database } from '../db/client.js'
import { notifications, pushDeliveries, pushSubscriptions } from '../db/schema.js'
import { notificationCategory } from '../notifications/preferences.js'
import { redactPushFailureReason } from '../push/retry-policy.js'

const retryParams = z.object({ deliveryId: z.uuid() })

export async function adminNotificationDeliveryRoutes(app: FastifyInstance) {
  app.get('/stats', async (request, reply) => {
    const session = await requireAdmin(request.headers.cookie, reply)
    if (!session) return
    const since = new Date(Date.now() - 30 * 86_400_000)
    const inactiveBefore = new Date(Date.now() - 30 * 86_400_000)

    const [notificationRows, deliveryRows, subscriptionRows, failures] = await Promise.all([
      database.select({ role: notifications.targetRole, type: notifications.type }).from(notifications).where(gte(notifications.createdAt, since)),
      database.select({ status: pushDeliveries.status, count: sql<number>`count(*)::int` }).from(pushDeliveries).where(gte(pushDeliveries.attemptedAt, since)).groupBy(pushDeliveries.status),
      database.select({ inactive: sql<boolean>`${pushSubscriptions.lastUsedAt} < ${inactiveBefore}` }).from(pushSubscriptions),
      database.select({
        id: pushDeliveries.id,
        status: pushDeliveries.status,
        attemptCount: pushDeliveries.attemptCount,
        responseStatus: pushDeliveries.responseStatus,
        failureReason: pushDeliveries.failureReason,
        attemptedAt: pushDeliveries.attemptedAt,
        notificationTitle: notifications.title,
        role: notifications.targetRole,
        retryEligible: isNotNull(pushDeliveries.subscriptionId),
      }).from(pushDeliveries).innerJoin(notifications, eq(notifications.id, pushDeliveries.notificationId)).where(and(
        gte(pushDeliveries.attemptedAt, since),
        sql`${pushDeliveries.status} in ('failed', 'invalid_subscription')`,
      )).orderBy(desc(pushDeliveries.attemptedAt)).limit(25),
    ])

    const byRole: Record<string, number> = {}
    const byCategory: Record<string, number> = {}
    for (const row of notificationRows) {
      byRole[row.role] = (byRole[row.role] ?? 0) + 1
      const category = notificationCategory(row.type)
      byCategory[category] = (byCategory[category] ?? 0) + 1
    }
    const statuses = Object.fromEntries(deliveryRows.map((row) => [row.status, row.count])) as Record<string, number>
    const invalidSubscriptions = statuses.invalid_subscription ?? 0
    const inactiveSubscriptions = subscriptionRows.filter((row) => row.inactive).length

    return reply.send({
      periodDays: 30,
      volume: { total: notificationRows.length, byRole, byCategory },
      delivery: {
        sent: (statuses.delivered ?? 0) + (statuses.failed ?? 0) + (statuses.invalid_subscription ?? 0) + (statuses.pending ?? 0) + (statuses.processing ?? 0) + (statuses.retrying ?? 0),
        delivered: statuses.delivered ?? 0,
        failed: statuses.failed ?? 0,
        pending: (statuses.pending ?? 0) + (statuses.processing ?? 0) + (statuses.retrying ?? 0),
        suppressed: statuses.suppressed ?? 0,
      },
      subscriptions: { active: subscriptionRows.length - inactiveSubscriptions, inactive: inactiveSubscriptions, invalid: invalidSubscriptions },
      failures: failures.map((failure) => ({ ...failure, failureReason: redactPushFailureReason(failure.failureReason) })),
    })
  })

  app.post('/:deliveryId/retry', async (request, reply) => {
    const session = await requireAdmin(request.headers.cookie, reply)
    if (!session) return
    const params = retryParams.safeParse(request.params)
    if (!params.success) return reply.status(400).send({ message: 'Choose a valid delivery.' })
    const [delivery] = await database.update(pushDeliveries).set({
      status: 'retrying', nextAttemptAt: new Date(), failedAt: null, failureReason: null, error: null,
    }).where(and(
      eq(pushDeliveries.id, params.data.deliveryId),
      eq(pushDeliveries.status, 'failed'),
      isNotNull(pushDeliveries.subscriptionId),
    )).returning({ id: pushDeliveries.id })
    if (!delivery) return reply.status(409).send({ message: 'This delivery is not eligible for retry.' })
    request.log.info({ event: 'admin_push_delivery_retry', deliveryId: delivery.id, adminUserId: session.userId }, 'Admin queued push delivery retry')
    return reply.send({ queued: true, deliveryId: delivery.id })
  })
}

async function requireAdmin(cookie: string | undefined, reply: FastifyReply) {
  const session = await getCurrentSessionContext(cookie)
  if (!session) { reply.status(401).send({ error: 'unauthenticated' }); return null }
  if (session.activeRole !== 'admin') { reply.status(403).send({ error: 'forbidden' }); return null }
  return session
}
