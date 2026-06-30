import 'dotenv/config'

import { and, asc, eq, notInArray } from 'drizzle-orm'

import { database, databasePool } from './client.js'
import {
  referrals,
  salesAgentProfiles,
  userRoles,
  users,
} from './schema.js'

async function main() {
  const [agent] = await database
    .select({
      userId: salesAgentProfiles.userId,
      referralCode: salesAgentProfiles.referralCode,
    })
    .from(salesAgentProfiles)
    .where(eq(salesAgentProfiles.status, 'active'))
    .orderBy(asc(salesAgentProfiles.createdAt))
    .limit(1)

  if (!agent) {
    throw new Error('No active sales agent found.')
  }

  const customers = await database
    .select({
      id: users.id,
      email: users.email,
    })
    .from(users)
    .innerJoin(userRoles, eq(users.id, userRoles.userId))
    .where(
      and(
        notInArray(users.status, ['suspended', 'disabled']),
        eq(userRoles.role, 'customer'),
      ),
    )
    .orderBy(asc(users.createdAt))
    .limit(2)

  if (customers.length === 0) {
    throw new Error('No eligible customer users found.')
  }

  for (const customer of customers) {
    await database
      .insert(referrals)
      .values({
        salesAgentId: agent.userId,
        customerId: customer.id,
        referralCode: agent.referralCode,
        status: 'attributed',
      })
      .onConflictDoNothing()
  }

  console.log(`Attached ${customers.length} customer downline(s) to sales agent ${agent.referralCode}:`)
  for (const customer of customers) {
    console.log(`- ${customer.email}`)
  }
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await databasePool.end()
  })
