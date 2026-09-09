import assert from 'node:assert/strict'
import test from 'node:test'

import { notificationRetentionPolicy } from './retention-policy.js'

test('keeps unread notifications longer than read notifications', () => {
  const policy = notificationRetentionPolicy()
  assert.deepEqual(policy, { readDays: 90, unreadDays: 180 })
  assert.ok(policy.unreadDays > policy.readDays)
})
