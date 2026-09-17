import assert from 'node:assert/strict'
import test from 'node:test'
import { pushMessagePolicy } from './message-policy.js'

test('posting reminders expire at Lagos midnight rather than accumulating for days', () => {
  const createdAt = new Date('2026-09-17T08:00:00Z')
  const fresh = pushMessagePolicy('sales_agent_daily_post_reminder', createdAt, createdAt, 'sales_agent')
  assert.equal(fresh.ttl, 15 * 60 * 60)
  assert.equal(fresh.expiresAt.toISOString(), '2026-09-17T23:00:00.000Z')
  assert.equal(fresh.urgency, 'normal')
  assert.equal(pushMessagePolicy('sales_agent_daily_post_reminder', createdAt, new Date('2026-09-18T08:00:00Z')).ttl, 0)
})

test('time-sensitive order/payment alerts request high urgency with bounded provider retention', () => {
  const createdAt = new Date('2026-09-17T08:00:00Z')
  for (const type of ['admin_payment_verified', 'order_created', 'order_cancelled', 'restaurant_new_order', 'pickup_ready']) {
    const policy = pushMessagePolicy(type, createdAt, createdAt)
    assert.equal(policy.urgency, 'high')
    assert.equal(policy.ttl, 48 * 60 * 60)
    assert.equal(policy.topic, undefined)
  }
})

test('reminder topics collapse repeat pending reminders but are separated by role', () => {
  const now = new Date('2026-09-17T08:00:00Z')
  const agent = pushMessagePolicy('sales_agent_daily_post_reminder', now, now, 'sales_agent')
  assert.match(agent.topic!, /^[A-Za-z0-9_-]{32}$/)
  assert.notEqual(agent.topic, pushMessagePolicy('sales_agent_daily_post_reminder', now, now, 'customer').topic)
})
