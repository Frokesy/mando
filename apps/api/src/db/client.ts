import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { resolveDatabaseUrl } from '../config/database-url.js'

const databaseUrl = resolveDatabaseUrl()

export const databasePool = new Pool({
  connectionString: databaseUrl,
  max: 10,
})

export const database = drizzle({ client: databasePool })
