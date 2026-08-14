import assert from 'node:assert/strict'
import test from 'node:test'

import {
  canQualifyReferralFromDeliveredOrder,
  isRealizedCommissionStatus,
  isWithdrawableCommissionStatus,
} from './earnings.js'

test('pending commission is neither realized nor withdrawable', () => {
  assert.equal(isRealizedCommissionStatus('pending'), false)
  assert.equal(isWithdrawableCommissionStatus('pending'), false)
})

test('only delivered first-order lifecycle can remain qualified', () => {
  assert.equal(canQualifyReferralFromDeliveredOrder('attributed', null), true)
  assert.equal(canQualifyReferralFromDeliveredOrder('qualified', 'failed'), true)
  assert.equal(canQualifyReferralFromDeliveredOrder('qualified', 'cancelled'), true)
  assert.equal(canQualifyReferralFromDeliveredOrder('qualified', 'delivered'), false)
})

test('earned and approved commissions can be withdrawn, paid cannot be withdrawn twice', () => {
  assert.equal(isWithdrawableCommissionStatus('earned'), true)
  assert.equal(isWithdrawableCommissionStatus('approved'), true)
  assert.equal(isWithdrawableCommissionStatus('paid'), false)
  assert.equal(isRealizedCommissionStatus('paid'), true)
  assert.equal(isRealizedCommissionStatus('reversed'), false)
})
