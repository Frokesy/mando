import 'dotenv/config'

import { eq, sql } from 'drizzle-orm'

import { hashPassword } from '../auth/password.js'
import { database, databasePool } from './client.js'
import { profiles, userRoles, users } from './schema.js'

const DEFAULT_DEV_PASSWORD = 'Password123!'

async function main() {
  const email = normalizeEmail(process.env.SUPERADMIN_EMAIL ?? 'superadmin@mando.test')
  const fullName = process.env.SUPERADMIN_NAME?.trim() || 'Mando Super Admin'
  const phone = process.env.SUPERADMIN_PHONE?.trim() || null
  const password = getSeedPassword()
  const passwordHash = await hashPassword(password)

  const [existingUser] = await database
    .select({ id: users.id })
    .from(users)
    .where(sql`lower(${users.email}) = ${email}`)
    .limit(1)

  const user = existingUser ?? (await createSuperAdmin(email, passwordHash))

  if (existingUser) {
    await database
      .update(users)
      .set({
        email,
        passwordHash,
        status: 'active',
        emailVerifiedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id))
  }

  await database
    .insert(profiles)
    .values({
      userId: user.id,
      fullName,
      phone,
    })
    .onConflictDoUpdate({
      target: profiles.userId,
      set: {
        fullName,
        phone,
        updatedAt: new Date(),
      },
    })

  await database
    .insert(userRoles)
    .values({
      userId: user.id,
      role: 'admin',
    })
    .onConflictDoNothing()

  console.log('Superadmin is ready:')
  console.log(`- Email: ${email}`)
  if (process.env.NODE_ENV !== 'production' && !process.env.SUPERADMIN_PASSWORD) {
    console.log(`- Dev password: ${DEFAULT_DEV_PASSWORD}`)
  }
}

async function createSuperAdmin(email: string, passwordHash: string) {
  const [createdUser] = await database
    .insert(users)
    .values({
      email,
      passwordHash,
      status: 'active',
      emailVerifiedAt: new Date(),
    })
    .returning({ id: users.id })

  if (!createdUser) {
    throw new Error('Unable to create superadmin user.')
  }

  return createdUser
}

function getSeedPassword() {
  const password = process.env.SUPERADMIN_PASSWORD?.trim()

  if (password) return password

  if (process.env.NODE_ENV === 'production') {
    throw new Error('SUPERADMIN_PASSWORD is required when seeding in production.')
  }

  return DEFAULT_DEV_PASSWORD
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await databasePool.end()
  })