import assert from 'node:assert/strict'
import test from 'node:test'

import { normalizeRoutePayTransactionStatus } from './routepay.js'

test('normalizes RoutePay final and intermediate status codes conservatively', () => {
  assert.equal(normalizeRoutePayTransactionStatus('0'), 'successful')
  assert.equal(normalizeRoutePayTransactionStatus('550'), 'failed')
  assert.equal(normalizeRoutePayTransactionStatus('220'), 'failed')
  assert.equal(normalizeRoutePayTransactionStatus('250'), 'pending')
  assert.equal(normalizeRoutePayTransactionStatus('260'), 'pending')
  assert.equal(normalizeRoutePayTransactionStatus('210'), 'pending')
  assert.equal(normalizeRoutePayTransactionStatus('unexpected'), 'unknown')
  assert.equal(normalizeRoutePayTransactionStatus(null), 'unknown')
})
