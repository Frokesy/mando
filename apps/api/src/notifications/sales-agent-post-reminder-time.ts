const LAGOS_UTC_OFFSET_MS = 60 * 60 * 1000
const ONE_DAY_MS = 24 * 60 * 60 * 1000
const REMINDER_HOUR_LAGOS = 9

export function getSalesAgentReminderWindow(now = new Date()) {
  const lagosNow = new Date(now.getTime() + LAGOS_UTC_OFFSET_MS)
  const year = lagosNow.getUTCFullYear()
  const month = lagosNow.getUTCMonth()
  const day = lagosNow.getUTCDate()
  const dayStart = new Date(Date.UTC(year, month, day) - LAGOS_UTC_OFFSET_MS)
  const reminderAt = new Date(dayStart.getTime() + REMINDER_HOUR_LAGOS * 60 * 60 * 1000)

  return {
    dayStart,
    dayEnd: new Date(dayStart.getTime() + ONE_DAY_MS),
    reminderAt,
    shouldSend: now.getTime() >= reminderAt.getTime(),
  }
}

export function millisecondsUntilNextSalesAgentReminder(now = new Date()) {
  const { reminderAt } = getSalesAgentReminderWindow(now)
  const nextReminderAt = reminderAt.getTime() > now.getTime()
    ? reminderAt
    : new Date(reminderAt.getTime() + ONE_DAY_MS)

  return Math.max(1_000, nextReminderAt.getTime() - now.getTime())
}
