import type { FastifyPluginAsync } from 'fastify'

import { createDailySalesAgentPostReminders } from '../notifications/sales-agent-post-reminder.js'
import { deliverPendingPushNotifications } from '../push/delivery.js'
import { isAuthorizedCronRequest } from './cron-auth.js'

export const cronRoutes: FastifyPluginAsync = async (app) => {
  app.post('/notifications', async (request, reply) => {
    const secret = process.env.CRON_SECRET
    if (!secret || secret.length < 32) {
      request.log.error('CRON_SECRET is missing or shorter than 32 characters')
      return reply.code(503).send({ message: 'Scheduled notification execution is not configured.' })
    }

    if (!isAuthorizedCronRequest(request.headers.authorization, secret)) {
      return reply.code(401).send({ message: 'Unauthorized.' })
    }

    const startedAt = new Date()
    const remindersCreated = await createDailySalesAgentPostReminders(startedAt)
    const deliverySummary = await deliverPendingPushNotifications(request.log)

    request.log.info({ remindersCreated, startedAt }, 'Scheduled notification cycle completed')
    return {
      ok: true,
      remindersCreated,
      deliverySummary,
      startedAt: startedAt.toISOString(),
      completedAt: new Date().toISOString(),
    }
  })
}
