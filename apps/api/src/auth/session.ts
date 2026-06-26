import { createHmac, randomBytes } from 'node:crypto'

import { getAuthConfig } from '../config/auth.js'

const SESSION_TOKEN_BYTES = 32

export type SessionToken = {
  token: string
  tokenHash: string
  expiresAt: Date
}

export function createSessionToken(now = new Date()): SessionToken {
  const { sessionTtlMs } = getAuthConfig()
  const token = randomBytes(SESSION_TOKEN_BYTES).toString('base64url')

  return {
    token,
    tokenHash: hashSessionToken(token),
    expiresAt: new Date(now.getTime() + sessionTtlMs),
  }
}

export function hashSessionToken(token: string): string {
  const { sessionSecret } = getAuthConfig()

  return createHmac('sha256', sessionSecret).update(token).digest('base64url')
}

export function isSessionExpired(expiresAt: Date, now = new Date()) {
  return expiresAt.getTime() <= now.getTime()
}
export function serializeSessionCookie(session: SessionToken) {
  const { sessionCookieName } = getAuthConfig()
  const maxAgeSeconds = Math.max(
    0,
    Math.floor((session.expiresAt.getTime() - Date.now()) / 1000),
  )
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''

  return [
    `${sessionCookieName}=${session.token}`,
    'HttpOnly',
    'Path=/',
    'SameSite=Lax',
    `Max-Age=${maxAgeSeconds}`,
    `Expires=${session.expiresAt.toUTCString()}`,
    secure,
  ]
    .filter(Boolean)
    .join('; ')
}
