import { and, eq, gte, inArray, lt, sql } from 'drizzle-orm'

import { database } from '../db/client.js'
import { notifications, salesAgentProfiles, userRoles, users } from '../db/schema.js'
import {
  getSalesAgentReminderWindow,
  millisecondsUntilNextSalesAgentReminder,
} from './sales-agent-post-reminder-time.js'

const SCHEDULER_LOCK = 'mando:sales-agent-daily-post-reminder'

export const SALES_AGENT_POST_REMINDER_TYPE = 'sales_agent_daily_post_reminder'

export async function createDailySalesAgentPostReminders(now = new Date()) {
  const window = getSalesAgentReminderWindow(now)
  if (!window.shouldSend) return 0

  return database.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${SCHEDULER_LOCK}))`)

    const [existing] = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(notifications)
      .where(and(
        eq(notifications.type, SALES_AGENT_POST_REMINDER_TYPE),
        gte(notifications.createdAt, window.dayStart),
        lt(notifications.createdAt, window.dayEnd),
      ))

    if ((existing?.count ?? 0) > 0) return 0

    const agents = await tx
      .select({ userId: userRoles.userId })
      .from(userRoles)
      .innerJoin(users, eq(users.id, userRoles.userId))
      .innerJoin(salesAgentProfiles, eq(salesAgentProfiles.userId, userRoles.userId))
      .where(and(
        eq(userRoles.role, 'sales_agent'),
        eq(salesAgentProfiles.status, 'active'),
        inArray(users.status, ['active', 'pending']),
      ))

    if (!agents.length) return 0

    await tx.insert(notifications).values(agents.map(({ userId }) => ({
      userId,
      type: SALES_AGENT_POST_REMINDER_TYPE,
      title: 'Time to post today’s Mando offers',
      body: 'Good morning! Share today’s Mando food offers with your audience and keep your referral link active.',
      data: { url: '/sales-agent/dashboard', targetRole: 'sales_agent' },
    })))

    return agents.length
  })
}

export function startSalesAgentPostReminderScheduler(logError: (error: unknown) => void) {
  let timer: NodeJS.Timeout | undefined
  let stopped = false

  const scheduleNext = () => {
    if (stopped) return
    timer = setTimeout(run, millisecondsUntilNextSalesAgentReminder())
    timer.unref()
  }

  const run = async () => {
    try {
      await createDailySalesAgentPostReminders()
    } catch (error) {
      logError(error)
    } finally {
      scheduleNext()
    }
  }

  void run()

  return () => {
    stopped = true
    if (timer) clearTimeout(timer)
  }
}
