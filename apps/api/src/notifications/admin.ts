import { and, eq, inArray } from 'drizzle-orm'

import { database } from '../db/client.js'
import { notifications, userRoles, users } from '../db/schema.js'

export async function notifyActiveAdmins(input: {
  type: `admin_${string}`
  title: string
  body: string
  data?: Record<string, unknown>
}) {
  const admins = await database.select({ userId: userRoles.userId })
    .from(userRoles)
    .innerJoin(users, eq(users.id, userRoles.userId))
    .where(and(eq(userRoles.role, 'admin'), inArray(users.status, ['active', 'pending'])))

  if (!admins.length) return
  await database.insert(notifications).values(admins.map((admin) => ({
    userId: admin.userId,
    type: input.type,
    title: input.title,
    body: input.body,
    data: input.data,
  })))
}
