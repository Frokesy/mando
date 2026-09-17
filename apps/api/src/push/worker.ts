import 'dotenv/config'

import { setTimeout as delay } from 'node:timers/promises'
import { databasePool, ensureDatabaseConnection } from '../db/client.js'
import { createDailySalesAgentPostReminders } from '../notifications/sales-agent-post-reminder.js'
import { deliverPendingPushNotifications, getPushPublicKey } from './delivery.js'

const logger = {
  info: (details: object, message: string) => console.info(JSON.stringify({ ...details, message })),
  warn: (details: object, message: string) => console.warn(JSON.stringify({ ...details, message })),
  error: (details: object, message: string) => console.error(JSON.stringify({ ...details, message })),
}
let stopping = false
process.on('SIGTERM', () => { stopping = true })
process.on('SIGINT', () => { stopping = true })

try {
  if (!getPushPublicKey() || !process.env.VAPID_PRIVATE_KEY || !process.env.VAPID_SUBJECT) {
    throw new Error('The notification worker requires all three VAPID settings.')
  }
  await ensureDatabaseConnection()
  logger.info({ event: 'notification_worker_started' }, 'Always-on notification worker started')
  while (!stopping) {
    try {
      await createDailySalesAgentPostReminders()
      await deliverPendingPushNotifications(logger)
    } catch (error) {
      logger.error({ event: 'notification_worker_cycle_failed', message: error instanceof Error ? error.message : 'Unknown error' }, 'Notification worker cycle failed')
    }
    if (!stopping) await delay(5_000)
  }
} catch (error) {
  console.error(error)
  process.exitCode = 1
} finally {
  await databasePool.end()
}
