import assert from 'node:assert/strict'
import test from 'node:test'

import { notificationPresentation } from './presentation.js'

test('normalizes notification presentation with safe fallbacks and category', () => {
  assert.deepEqual(notificationPresentation('payment_verified', '  ', ''), {
    category: 'payments', title: 'Mando update', body: 'You have a new update from Mando.', icon: '/icons/icon-192.png', badge: '/icons/icon-192.png',
  })
})
