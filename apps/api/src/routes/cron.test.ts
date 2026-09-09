import assert from 'node:assert/strict'
import test from 'node:test'

import { isAuthorizedCronRequest } from './cron-auth.js'

const secret = 'a-production-cron-secret-with-32-characters'

test('cron authorization accepts the configured bearer secret', () => {
  assert.equal(isAuthorizedCronRequest(`Bearer ${secret}`, secret), true)
})

test('cron authorization rejects missing, malformed, and incorrect credentials', () => {
  assert.equal(isAuthorizedCronRequest(undefined, secret), false)
  assert.equal(isAuthorizedCronRequest(secret, secret), false)
  assert.equal(isAuthorizedCronRequest('Basic credentials', secret), false)
  assert.equal(isAuthorizedCronRequest('Bearer wrong-secret', secret), false)
})
