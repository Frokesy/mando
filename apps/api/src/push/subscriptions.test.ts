import assert from 'node:assert/strict'
import test from 'node:test'
import { randomUUID } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { buildApp } from '../app.js'
import { createSessionToken, serializeSessionCookie } from '../auth/session.js'
import { database } from '../db/client.js'
import { authSessions, pushSubscriptions, userRoles, users } from '../db/schema.js'

test('role subscriptions coexist, survive role refresh, and disable independently without account leakage', async () => {
  assert.equal(process.env.NODE_ENV, 'test', 'Integration test must run against TEST_DATABASE_URL')
  const app = buildApp()
  const firstUserId = randomUUID()
  const secondUserId = randomUUID()
  const endpoint = `https://push.example.test/${randomUUID()}`
  const payload = { endpoint, keys: { p256dh: 'test-key', auth: 'test-auth' } }
  const cookies: string[] = []
  try {
    await database.insert(users).values([firstUserId, secondUserId].map((id) => ({
      id, email: `push-test-${id}@mando.test`, passwordHash: 'test-only', status: 'active' as const,
    })))
    for (const [userId, role] of [[firstUserId, 'customer'], [firstUserId, 'sales_agent'], [secondUserId, 'customer']] as const) {
      await database.insert(userRoles).values({ userId, role })
      const session = createSessionToken()
      await database.insert(authSessions).values({ userId, activeRole: role, tokenHash: session.tokenHash, expiresAt: session.expiresAt })
      cookies.push(serializeSessionCookie(session).split(';')[0])
    }
    const register = (cookie: string, refreshOnly = false) => app.inject({
      method: 'POST', url: '/push/subscriptions', headers: { cookie }, payload: { ...payload, refreshOnly },
    })
    assert.equal((await register(cookies[0])).statusCode, 204)
    assert.equal((await register(cookies[1])).statusCode, 204)
    assert.equal((await register(cookies[0], true)).statusCode, 204)
    let rows = await database.select().from(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint))
    assert.equal(rows.length, 2)
    assert.deepEqual(rows.map((row) => row.role).sort(), ['customer', 'sales_agent'])
    const response = await app.inject({ method: 'DELETE', url: '/push/subscriptions', headers: { cookie: cookies[0] }, payload: { endpoint } })
    assert.equal(response.json().remainingBindings, 1)
    await register(cookies[0], true)
    rows = await database.select().from(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint))
    assert.equal(rows.length, 1, 'Refreshing a dashboard must not re-enable a disabled role')
    assert.equal(rows[0].role, 'sales_agent')
    assert.equal((await register(cookies[2], true)).statusCode, 204)
    rows = await database.select().from(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint))
    assert.equal(rows.length, 0, 'A different account must not inherit or retain the former account bindings')
    assert.equal((await register(cookies[2])).statusCode, 204)
    rows = await database.select().from(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint))
    assert.equal(rows[0].userId, secondUserId)
  } finally {
    await app.close()
    await database.delete(users).where(eq(users.id, firstUserId))
    await database.delete(users).where(eq(users.id, secondUserId))
  }
})
