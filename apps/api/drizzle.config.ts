import 'dotenv/config'

import { defineConfig } from 'drizzle-kit'
import { resolveDatabaseUrl } from './src/config/database-url.js'

const databaseUrl = resolveDatabaseUrl()

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './drizzle',
  dbCredentials: {
    url: databaseUrl,
  },
})
