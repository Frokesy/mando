const DEFAULT_SESSION_TTL_DAYS = 30
const MIN_SESSION_SECRET_LENGTH = 32

export type AuthConfig = {
  sessionSecret: string
  sessionTtlMs: number
}

export function getAuthConfig(): AuthConfig {
  const sessionSecret = process.env.SESSION_SECRET

  if (!sessionSecret) {
    throw new Error('SESSION_SECRET is missing. Add it to apps/api/.env.')
  }

  if (sessionSecret.length < MIN_SESSION_SECRET_LENGTH) {
    throw new Error(
      `SESSION_SECRET must be at least ${MIN_SESSION_SECRET_LENGTH} characters long.`,
    )
  }

  const sessionTtlDays = Number(
    process.env.SESSION_TTL_DAYS ?? DEFAULT_SESSION_TTL_DAYS,
  )

  if (!Number.isFinite(sessionTtlDays) || sessionTtlDays <= 0) {
    throw new Error('SESSION_TTL_DAYS must be a positive number.')
  }

  return {
    sessionSecret,
    sessionTtlMs: sessionTtlDays * 24 * 60 * 60 * 1000,
  }
}
