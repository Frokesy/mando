import assert from 'node:assert/strict'
import test from 'node:test'

import {
  getSalesAgentReminderWindow,
  millisecondsUntilNextSalesAgentReminder,
} from './sales-agent-post-reminder-time.js'

test('does not send before 9am Lagos time', () => {
  const window = getSalesAgentReminderWindow(new Date('2026-09-09T07:59:59.000Z'))
  assert.equal(window.shouldSend, false)
  assert.equal(window.reminderAt.toISOString(), '2026-09-09T08:00:00.000Z')
})

test('sends at 9am Lagos time', () => {
  const window = getSalesAgentReminderWindow(new Date('2026-09-09T08:00:00.000Z'))
  assert.equal(window.shouldSend, true)
  assert.equal(window.dayStart.toISOString(), '2026-09-08T23:00:00.000Z')
  assert.equal(window.dayEnd.toISOString(), '2026-09-09T23:00:00.000Z')
})

test('schedules the following day after the daily reminder time', () => {
  const delay = millisecondsUntilNextSalesAgentReminder(new Date('2026-09-09T08:30:00.000Z'))
  assert.equal(delay, 23.5 * 60 * 60 * 1000)
})
