import 'dotenv/config'

import { sql } from 'drizzle-orm'

import { database, databasePool } from './client.js'

try {
  const result = await database.execute<{
    database_name: string
    current_time: Date | string
  }>(sql`
    select
      current_database() as database_name,
      now() as current_time
  `)

  const connection = result.rows[0]
  const currentTime = new Date(connection.current_time).toISOString()

  console.log(
    `Database connection successful: ${connection.database_name} at ${currentTime}`,
  )
} catch (error) {
  console.error('Database connection failed.')
  console.error(error)
  process.exitCode = 1
} finally {
  await databasePool.end()
}
