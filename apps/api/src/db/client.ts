import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { resolveDatabaseUrl } from '../config/database-url.js'

const databaseUrl = resolveDatabaseUrl()

export const databasePool = new Pool({
  connectionString: databaseUrl,
  max: 10,
  connectionTimeoutMillis: Number(process.env.DATABASE_CONNECTION_TIMEOUT_MS ?? 20_000),
  idleTimeoutMillis: Number(process.env.DATABASE_IDLE_TIMEOUT_MS ?? 30_000),
  keepAlive: true,
})

export const database = drizzle({ client: databasePool })

export async function ensureDatabaseConnection(maxAttempts = 3) {
  let lastError: unknown

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await databasePool.query('select 1')
      return
    } catch (error) {
      lastError = error
      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 750))
      }
    }
  }

  throw lastError
}
