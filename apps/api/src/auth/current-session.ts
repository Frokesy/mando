import { eq, lt } from 'drizzle-orm'

import {
  getSessionTokenFromCookie,
  hashSessionToken,
  isSessionExpired,
} from './index.js'
import { getAuthConfig } from '../config/auth.js'
import { database } from '../db/client.js'
import { authSessions, profiles, userRoles, users } from '../db/schema.js'

export async function getCurrentSessionContext(cookieHeader: string | undefined) {
  const token = getSessionTokenFromCookie(cookieHeader)

  if (!token) {
    return null
  }

  await database.delete(authSessions).where(lt(authSessions.expiresAt, new Date()))

  const [sessionUser] = await database
    .select({
      sessionId: authSessions.id,
      activeRole: authSessions.activeRole,
      revokedAt: authSessions.revokedAt,
      expiresAt: authSessions.expiresAt,
      userId: users.id,
      email: users.email,
      status: users.status,
      createdAt: users.createdAt,
    })
    .from(authSessions)
    .innerJoin(users, eq(authSessions.userId, users.id))
    .where(eq(authSessions.tokenHash, hashSessionToken(token)))
    .limit(1)

  if (!sessionUser) {
    return null
  }

  if (sessionUser.revokedAt || isSessionExpired(sessionUser.expiresAt)) {
    await database
      .delete(authSessions)
      .where(eq(authSessions.id, sessionUser.sessionId))

    return null
  }

  if (sessionUser.status === 'suspended' || sessionUser.status === 'disabled') {
    return null
  }

  const { sessionTtlMs } = getAuthConfig()

  await database
    .update(authSessions)
    .set({ expiresAt: new Date(Date.now() + sessionTtlMs) })
    .where(eq(authSessions.id, sessionUser.sessionId))

  const [profile] = await database
    .select({
      fullName: profiles.fullName,
      phone: profiles.phone,
      birthday: profiles.birthday,
      avatarUrl: profiles.avatarUrl,
    })
    .from(profiles)
    .where(eq(profiles.userId, sessionUser.userId))
    .limit(1)

  const roles = await database
    .select({
      role: userRoles.role,
    })
    .from(userRoles)
    .where(eq(userRoles.userId, sessionUser.userId))

  return {
    sessionId: sessionUser.sessionId,
    userId: sessionUser.userId,
    activeRole: sessionUser.activeRole,
    authPayload: {
      user: {
        id: sessionUser.userId,
        email: sessionUser.email,
        status: sessionUser.status,
        createdAt: sessionUser.createdAt,
      },
      profile,
      roles: roles.map((userRole) => userRole.role),
      activeRole: sessionUser.activeRole,
    },
  }
}
