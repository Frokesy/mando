import type { FastifyInstance } from 'fastify'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'

import { getCurrentSessionContext } from '../auth/current-session.js'
import { database } from '../db/client.js'
import { notifications, pushSubscriptions } from '../db/schema.js'
import { deliverPendingPushNotifications, getPushPublicKey } from '../push/delivery.js'

const subscriptionSchema = z.object({
  endpoint: z.url(),
  keys: z.object({ p256dh: z.string().min(1), auth: z.string().min(1) }),
})

export async function pushRoutes(app: FastifyInstance) {
  app.get('/public-key', async (_request, reply) => {
    const publicKey = getPushPublicKey()
    if (!publicKey) return reply.status(503).send({ error: 'push_not_configured' })
    return reply.send({ publicKey })
  })

  app.post('/subscriptions', async (request, reply) => {
    const session = await getCurrentSessionContext(request.headers.cookie)
    if (!session) return reply.status(401).send({ error: 'unauthenticated' })
    const body = subscriptionSchema.safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: 'invalid_subscription' })

    await database.insert(pushSubscriptions).values({
      userId: session.userId,
      role: session.activeRole,
      endpoint: body.data.endpoint,
      p256dh: body.data.keys.p256dh,
      auth: body.data.keys.auth,
      userAgent: request.headers['user-agent'] ?? null,
    }).onConflictDoUpdate({
      target: pushSubscriptions.endpoint,
      set: {
        userId: session.userId,
        role: session.activeRole,
        p256dh: body.data.keys.p256dh,
        auth: body.data.keys.auth,
        userAgent: request.headers['user-agent'] ?? null,
        lastUsedAt: new Date(),
        updatedAt: new Date(),
      },
    })
    return reply.status(204).send()
  })

  app.delete('/subscriptions', async (request, reply) => {
    const session = await getCurrentSessionContext(request.headers.cookie)
    if (!session) return reply.status(401).send({ error: 'unauthenticated' })
    const body = z.object({ endpoint: z.url() }).safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: 'invalid_subscription' })
    await database.delete(pushSubscriptions).where(and(
      eq(pushSubscriptions.endpoint, body.data.endpoint),
      eq(pushSubscriptions.userId, session.userId),
    ))
    return reply.status(204).send()
  })

  app.post('/test', async (request, reply) => {
    const session = await getCurrentSessionContext(request.headers.cookie)
    if (!session) return reply.status(401).send({ error: 'unauthenticated' })

    await database.insert(notifications).values({
      userId: session.userId,
      type: 'push_enabled',
      title: 'Mando notifications are on 🎉',
      body: 'You will now receive important Mando updates on this device.',
      data: { url: notificationUrl(session.activeRole) },
    })
    void deliverPendingPushNotifications().catch((error) => request.log.error(error, 'Test push delivery failed'))
    return reply.status(202).send({ queued: true })
  })
}

function notificationUrl(role: string) {
  if (role === 'sales_agent') return '/sales-agent/notifications'
  if (role === 'admin') return '/admin/dashboard/overview'
  return `/${role}/notifications`
}
