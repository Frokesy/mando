import assert from 'node:assert/strict'
import test from 'node:test'

import {
  decryptPayoutAccountNumber,
  encryptPayoutAccountNumber,
} from './payout-account-crypto.js'

test('encrypts and decrypts payout account numbers', () => {
  const previous = process.env.PAYOUT_ACCOUNT_ENCRYPTION_KEY
  process.env.PAYOUT_ACCOUNT_ENCRYPTION_KEY = 'test-only-payout-account-secret'
  try {
    const encrypted = encryptPayoutAccountNumber('0123456789')
    assert.notEqual(encrypted, '0123456789')
    assert.equal(decryptPayoutAccountNumber(encrypted), '0123456789')
    assert.equal(decryptPayoutAccountNumber('legacy-placeholder-6789'), null)
  } finally {
    if (previous === undefined) delete process.env.PAYOUT_ACCOUNT_ENCRYPTION_KEY
    else process.env.PAYOUT_ACCOUNT_ENCRYPTION_KEY = previous
  }
})
