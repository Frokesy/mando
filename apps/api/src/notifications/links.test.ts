import assert from 'node:assert/strict'
import test from 'node:test'

import { notificationFallbackUrl, safeNotificationUrl } from './links.js'

test('allows only role-specific notification links', () => {
  assert.equal(safeNotificationUrl('customer', '/customer/orders/123'), '/customer/orders/123')
  assert.equal(safeNotificationUrl('admin', '/admin/dashboard/orders'), '/admin/dashboard/orders')
  assert.equal(safeNotificationUrl('rider', '/customer/orders/123'), notificationFallbackUrl('rider'))
})

test('rejects external, protocol-relative, and missing notification links', () => {
  assert.equal(safeNotificationUrl('customer', 'https://evil.example'), '/customer/notifications')
  assert.equal(safeNotificationUrl('customer', '//evil.example'), '/customer/notifications')
  assert.equal(safeNotificationUrl('customer', null), '/customer/notifications')
})
