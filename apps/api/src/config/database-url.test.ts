import assert from 'node:assert/strict'
import test from 'node:test'

import { resolveDatabaseUrl } from './database-url.js'

test('test mode requires a dedicated database URL', () => {
  assert.throws(() => resolveDatabaseUrl({ NODE_ENV: 'test', DATABASE_URL: 'postgres://production' }), /TEST_DATABASE_URL/)
})

test('test mode refuses to reuse the normal database', () => {
  assert.throws(() => resolveDatabaseUrl({
    NODE_ENV: 'test',
    DATABASE_URL: 'postgres://same',
    TEST_DATABASE_URL: 'postgres://same',
  }), /must not be the same/)
})

test('test mode selects the dedicated test database', () => {
  assert.equal(resolveDatabaseUrl({
    NODE_ENV: 'test',
    DATABASE_URL: 'postgres://production',
    TEST_DATABASE_URL: 'postgres://test',
  }), 'postgres://test')
})
