import type { FastifyInstance } from 'fastify'
import { and, desc, eq, gte, isNotNull, isNull, ne, sql } from 'drizzle-orm'
import { z } from 'zod'

import { getCurrentSessionContext } from '../auth/current-session.js'
import { database } from '../db/client.js'
import { notificationPreferences, notifications, pushSubscriptions } from '../db/schema.js'
import { deliverPendingPushNotifications, getPushPublicKey } from '../push/delivery.js'
import {
  filterInAppNotifications,
  getNotificationPreferences,
  notificationCategories,
} from '../notifications/preferences.js'

const subscriptionSchema = z.object({
  endpoint: z.url(),
  keys: z.object({ p256dh: z.string().min(1), auth: z.string().min(1) }),
  refreshOnly: z.boolean().optional(),
})
const categoryPreferenceSchema = z.object({ push: z.boolean(), inApp: z.boolean() })
const preferencesSchema = z.object({
  pushEnabled: z.boolean(),
  inAppEnabled: z.boolean(),
  categories: z.object(Object.fromEntries(
    notificationCategories.map((category) => [category, categoryPreferenceSchema]),
  ) as Record<(typeof notificationCategories)[number], typeof categoryPreferenceSchema>),
  quietHoursEnabled: z.boolean(),
  quietHoursStart: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  quietHoursEnd: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
})
const notificationListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  status: z.enum(['all', 'unread', 'read', 'today']).default('all'),
})

export async function pushRoutes(app: FastifyInstance) {
  app.get('/notifications', async (request, reply) => {
    const session = await getCurrentSessionContext(request.headers.cookie)
    if (!session) return reply.status(401).send({ error: 'unauthenticated' })
    const query = notificationListQuerySchema.safeParse(request.query)
    if (!query.success) return reply.status(400).send({ error: 'invalid_notification_filters' })

    const conditions = [
      eq(notifications.userId, session.userId),
      eq(notifications.targetRole, session.activeRole),
    ]
    if (query.data.status === 'unread') conditions.push(isNull(notifications.readAt))
    if (query.data.status === 'read') conditions.push(isNotNull(notifications.readAt))
    if (query.data.status === 'today') conditions.push(gte(notifications.createdAt, startOfLagosDay()))

    const rows = await database.select({
      id: notifications.id,
      type: notifications.type,
      title: notifications.title,
      body: notifications.body,
      data: notifications.data,
      readAt: notifications.readAt,
      createdAt: notifications.createdAt,
    }).from(notifications).where(and(...conditions)).orderBy(desc(notifications.createdAt))
    const visibleRows = await filterInAppNotifications(rows, session.userId, session.activeRole)
    const unreadRows = await database.select({ type: notifications.type }).from(notifications).where(and(
      eq(notifications.userId, session.userId),
      eq(notifications.targetRole, session.activeRole),
      isNull(notifications.readAt),
    ))
    const visibleUnreadRows = await filterInAppNotifications(unreadRows, session.userId, session.activeRole)
    const total = visibleRows.length
    const offset = (query.data.page - 1) * query.data.limit
    return reply.send({
      notifications: visibleRows.slice(offset, offset + query.data.limit),
      unreadCount: visibleUnreadRows.length,
      pagination: { page: query.data.page, limit: query.data.limit, total, totalPages: Math.max(1, Math.ceil(total / query.data.limit)) },
    })
  })

  app.get('/unread-count', async (request, reply) => {
    const session = await getCurrentSessionContext(request.headers.cookie)
    if (!session) return reply.status(401).send({ error: 'unauthenticated' })

    const unreadRows = await database.select({ type: notifications.type }).from(notifications).where(and(
      eq(notifications.userId, session.userId),
      eq(notifications.targetRole, session.activeRole),
      isNull(notifications.readAt),
    ))
    const visibleRows = await filterInAppNotifications(unreadRows, session.userId, session.activeRole)
    return reply.send({ role: session.activeRole, unreadCount: visibleRows.length })
  })

  app.get('/preferences', async (request, reply) => {
    const session = await getCurrentSessionContext(request.headers.cookie)
    if (!session) return reply.status(401).send({ error: 'unauthenticated' })
    return reply.send({ preferences: await getNotificationPreferences(session.userId, session.activeRole) })
  })

  app.put('/preferences', async (request, reply) => {
    const session = await getCurrentSessionContext(request.headers.cookie)
    if (!session) return reply.status(401).send({ error: 'unauthenticated' })
    const body = preferencesSchema.safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: 'invalid_notification_preferences' })

    await database.insert(notificationPreferences).values({
      userId: session.userId,
      role: session.activeRole,
      ...body.data,
    }).onConflictDoUpdate({
      target: [notificationPreferences.userId, notificationPreferences.role],
      set: { ...body.data, updatedAt: new Date() },
    })
    return reply.send({ preferences: await getNotificationPreferences(session.userId, session.activeRole) })
  })

  app.get('/public-key', async (_request, reply) => {
    const publicKey = getPushPublicKey()
    if (!publicKey) return reply.status(503).send({ error: 'push_not_configured' })
    return reply.send({ publicKey })
  })

  app.get('/subscriptions', async (request, reply) => {
    const session = await getCurrentSessionContext(request.headers.cookie)
    if (!session) return reply.status(401).send({ error: 'unauthenticated' })
    const subscriptions = await database.select({ endpoint: pushSubscriptions.endpoint })
      .from(pushSubscriptions).where(and(
        eq(pushSubscriptions.userId, session.userId),
        eq(pushSubscriptions.role, session.activeRole),
      ))
    return reply.send({ subscriptions })
  })

  app.post('/subscriptions', async (request, reply) => {
    const session = await getCurrentSessionContext(request.headers.cookie)
    if (!session) return reply.status(401).send({ error: 'unauthenticated' })
    const body = subscriptionSchema.safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: 'invalid_subscription' })

    await database.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${body.data.endpoint}))`)
      await tx.delete(pushSubscriptions).where(and(
        eq(pushSubscriptions.endpoint, body.data.endpoint),
        ne(pushSubscriptions.userId, session.userId),
      ))
      if (body.data.refreshOnly) {
        await tx.update(pushSubscriptions).set({
          p256dh: body.data.keys.p256dh,
          auth: body.data.keys.auth,
          lastUsedAt: new Date(),
          updatedAt: new Date(),
        }).where(and(
          eq(pushSubscriptions.endpoint, body.data.endpoint),
          eq(pushSubscriptions.userId, session.userId),
          eq(pushSubscriptions.role, session.activeRole),
        ))
        return
      }
      // One device may subscribe to several roles of the SAME user.
      await tx.insert(pushSubscriptions).values({
        userId: session.userId,
        role: session.activeRole,
        endpoint: body.data.endpoint,
        p256dh: body.data.keys.p256dh,
        auth: body.data.keys.auth,
        userAgent: request.headers['user-agent'] ?? null,
      }).onConflictDoUpdate({
        target: [pushSubscriptions.endpoint, pushSubscriptions.userId, pushSubscriptions.role],
        set: {
          p256dh: body.data.keys.p256dh,
          auth: body.data.keys.auth,
          userAgent: request.headers['user-agent'] ?? null,
          lastUsedAt: new Date(),
          updatedAt: new Date(),
        },
      })
    })
    return reply.status(204).send()
  })

  app.delete('/subscriptions', async (request, reply) => {
    const session = await getCurrentSessionContext(request.headers.cookie)
    if (!session) return reply.status(401).send({ error: 'unauthenticated' })
    const body = z.object({ endpoint: z.url(), allRoles: z.boolean().optional() }).safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: 'invalid_subscription' })
    await database.delete(pushSubscriptions).where(and(
      eq(pushSubscriptions.endpoint, body.data.endpoint),
      eq(pushSubscriptions.userId, session.userId),
      ...(body.data.allRoles ? [] : [eq(pushSubscriptions.role, session.activeRole)]),
    ))
    const remaining = await database.select({ id: pushSubscriptions.id })
      .from(pushSubscriptions).where(eq(pushSubscriptions.endpoint, body.data.endpoint))
    return reply.send({ remainingBindings: remaining.length })
  })

  app.post('/test', async (request, reply) => {
    const session = await getCurrentSessionContext(request.headers.cookie)
    if (!session) return reply.status(401).send({ error: 'unauthenticated' })

    await database.insert(notifications).values({
      userId: session.userId,
      targetRole: session.activeRole,
      type: 'push_enabled',
      title: 'Mando notifications are on 🎉',
      body: 'You will now receive important Mando updates on this device.',
      data: { url: notificationUrl(session.activeRole) },
    })
    void deliverPendingPushNotifications().catch((error) => request.log.error(error, 'Test push delivery failed'))
    return reply.status(202).send({ queued: true })
  })
}

function startOfLagosDay(now = new Date()) {
  const lagosNow = new Date(now.getTime() + 60 * 60_000)
  return new Date(Date.UTC(lagosNow.getUTCFullYear(), lagosNow.getUTCMonth(), lagosNow.getUTCDate()) - 60 * 60_000)
}

function notificationUrl(role: string) {
  if (role === 'sales_agent') return '/sales-agent/notifications'
  if (role === 'admin') return '/admin/dashboard/overview'
  return `/${role}/notifications`
}
