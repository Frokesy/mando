type DatabaseEnvironment = Record<string, string | undefined>

export function resolveDatabaseUrl(environment: DatabaseEnvironment = process.env) {
  const isTest = environment.NODE_ENV === 'test' || environment.DATABASE_TARGET === 'test'

  if (isTest) {
    const testUrl = environment.TEST_DATABASE_URL?.trim()
    if (!testUrl) {
      throw new Error('TEST_DATABASE_URL is required when running tests or test-database commands.')
    }
    if (testUrl === environment.DATABASE_URL?.trim()) {
      throw new Error('TEST_DATABASE_URL must not be the same as DATABASE_URL.')
    }
    return testUrl
  }

  const databaseUrl = environment.DATABASE_URL?.trim()
  if (!databaseUrl) throw new Error('DATABASE_URL is missing.')
  return databaseUrl
}
