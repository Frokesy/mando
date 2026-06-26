import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  throw new Error(
    'DATABASE_URL is missing. Add it to apps/api/.env before starting the API.',
  )
}

export const databasePool = new Pool({
  connectionString: databaseUrl,
  max: 10,
})

export const database = drizzle({ client: databasePool })
