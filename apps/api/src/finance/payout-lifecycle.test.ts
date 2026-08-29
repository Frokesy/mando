import assert from 'node:assert/strict'
import test from 'node:test'

import { excludeLegacyReservedSources } from './payout-lifecycle.js'

test('legacy withdrawal reservations cannot be paid again by the new ledger', () => {
  const sources = [
    { id: 'old-1', amount: 500 },
    { id: 'old-2', amount: 100 },
    { id: 'new-1', amount: 500 },
  ]

  assert.deepEqual(excludeLegacyReservedSources(sources, 600), [sources[2]])
})

test('all earnings remain allocatable when there is no legacy reservation', () => {
  const sources = [{ id: 'new-1', amount: 500 }]
  assert.deepEqual(excludeLegacyReservedSources(sources, 0), sources)
})
