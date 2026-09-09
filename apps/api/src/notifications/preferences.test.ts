import assert from 'node:assert/strict'
import test from 'node:test'

import {
  defaultCategoryPreferences,
  isLagosQuietTime,
  notificationAllowed,
  notificationCategory,
} from './preferences.js'

const preferences = {
  pushEnabled: false,
  inAppEnabled: false,
  categories: defaultCategoryPreferences,
  quietHoursEnabled: true,
  quietHoursStart: '22:00',
  quietHoursEnd: '07:00',
}

test('categorizes core notification events', () => {
  assert.equal(notificationCategory('payment_failed'), 'payments')
  assert.equal(notificationCategory('commission_earned'), 'payouts')
  assert.equal(notificationCategory('order_ready_for_pickup'), 'delivery')
  assert.equal(notificationCategory('admin_customer_order_issue'), 'support')
  assert.equal(notificationCategory('sales_agent_daily_post_reminder'), 'marketing')
})

test('critical payment alerts override disabled channel preferences', () => {
  assert.equal(notificationAllowed('payment_failed', 'push', preferences), true)
  assert.equal(notificationAllowed('payment_refunded', 'inApp', preferences), true)
  assert.equal(notificationAllowed('order_created', 'push', preferences), false)
})

test('quiet hours use Lagos time and support an overnight window', () => {
  assert.equal(isLagosQuietTime(new Date('2026-09-09T22:00:00Z'), true, '22:00', '07:00'), true)
  assert.equal(isLagosQuietTime(new Date('2026-09-09T07:00:00Z'), true, '22:00', '07:00'), false)
  assert.equal(isLagosQuietTime(new Date('2026-09-09T22:00:00Z'), false, '22:00', '07:00'), false)
})
