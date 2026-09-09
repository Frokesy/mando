import assert from 'node:assert/strict'
import test from 'node:test'

import { MAX_PUSH_ATTEMPTS, pushFailureDecision, pushResponseStatus, safePushFailureReason } from './retry-policy.js'

const now = new Date('2026-09-09T08:00:00.000Z')

test('temporarily failed pushes use exponential retry delays', () => {
  assert.equal(pushFailureDecision(1, 503, now).retryAt?.toISOString(), '2026-09-09T08:01:00.000Z')
  assert.equal(pushFailureDecision(2, 429, now).retryAt?.toISOString(), '2026-09-09T08:02:00.000Z')
  assert.equal(pushFailureDecision(3, null, now).retryAt?.toISOString(), '2026-09-09T08:04:00.000Z')
})

test('stops retrying after the configured maximum', () => {
  assert.deepEqual(pushFailureDecision(MAX_PUSH_ATTEMPTS, 503, now), { status: 'failed', retryAt: null })
})

test('invalid subscription responses are never retried', () => {
  for (const status of [400, 401, 403, 404, 410]) {
    assert.deepEqual(pushFailureDecision(1, status, now), { status: 'invalid_subscription', retryAt: null })
  }
})

test('extracts valid statuses and redacts endpoint URLs from failure details', () => {
  assert.equal(pushResponseStatus({ statusCode: 503 }), 503)
  assert.equal(pushResponseStatus({ statusCode: 'invalid' }), null)
  assert.equal(safePushFailureReason(new Error('Request to https://push.example/secret failed')), 'Request to [push endpoint] failed')
})
