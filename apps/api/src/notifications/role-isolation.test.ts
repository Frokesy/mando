import assert from 'node:assert/strict'
import test from 'node:test'
import { randomUUID } from 'node:crypto'

import { and, eq } from 'drizzle-orm'

import { database } from '../db/client.js'
import { notifications, userRoles, users } from '../db/schema.js'

test('keeps notifications separate for a user with multiple roles', async () => {
  const userId = randomUUID()
  const email = `notification-role-test-${userId}@mando.test`

  await database.insert(users).values({
    id: userId,
    email,
    passwordHash: 'test-only-not-a-login-password',
    status: 'active',
  })

  try {
    await database.insert(userRoles).values([
      { userId, role: 'customer' },
      { userId, role: 'sales_agent' },
    ])
    await database.insert(notifications).values([
      {
        userId,
        targetRole: 'customer',
        type: 'role_isolation_customer_test',
        title: 'Customer notification',
        body: 'Customer only',
      },
      {
        userId,
        targetRole: 'sales_agent',
        type: 'role_isolation_sales_agent_test',
        title: 'Sales-agent notification',
        body: 'Sales agent only',
      },
    ])

    const customerRows = await database.select({ type: notifications.type })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.targetRole, 'customer')))
    const salesAgentRows = await database.select({ type: notifications.type })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.targetRole, 'sales_agent')))

    assert.deepEqual(customerRows.map(({ type }) => type), ['role_isolation_customer_test'])
    assert.deepEqual(salesAgentRows.map(({ type }) => type), ['role_isolation_sales_agent_test'])
  } finally {
    await database.delete(users).where(eq(users.id, userId))
  }
})
