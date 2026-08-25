import type { FastifyInstance, FastifyReply } from 'fastify'
import { randomBytes, randomInt, timingSafeEqual } from 'node:crypto'
import { and, desc, eq, gt, isNull, lt, sql } from 'drizzle-orm'
import { z } from 'zod'

import {
  createSessionToken,
  getSessionTokenFromCookie,
  hashPassword,
  hashSessionToken,
  serializeClearSessionCookie,
  serializeRefreshedSessionCookie,
  serializeSessionCookie,
  verifyPassword,
} from '../auth/index.js'
import { getCurrentSessionContext } from '../auth/current-session.js'
import { database } from '../db/client.js'
import { sendPasswordResetOtpEmail } from '../email/agent-credentials.js'
import {
  authSessions,
  profiles,
  referrals,
  salesAgentProfiles,
  userRoles,
  users,
  verificationTokens,
} from '../db/schema.js'

const signupBodySchema = z.object({
  email: z.email().trim().toLowerCase(),
  fullName: z.string().trim().min(1).max(120),
  password: z
    .string()
    .min(6)
    .regex(/[A-Z]/, 'Password must include at least one uppercase letter.')
    .regex(/\d/, 'Password must include at least one number.'),
  salesAgentId: z.uuid().optional(),
})

const loginAttemptWindowMs = 15 * 60 * 1000
const loginAttemptsPerWindow = 5
const loginAttempts = new Map<string, { count: number; windowStart: number }>()

const loginBodySchema = z.object({
  email: z.email().trim().toLowerCase(),
  password: z.string().min(1),
})

const selectRoleBodySchema = z.object({
  role: z.enum(['customer', 'rider', 'sales_agent', 'restaurant', 'admin']),
})

const passwordResetEmailSchema = z.object({ email: z.email().trim().toLowerCase() })
const passwordResetVerifySchema = passwordResetEmailSchema.extend({ otp: z.string().regex(/^\d{6}$/) })
const passwordResetCompleteSchema = passwordResetEmailSchema.extend({
  resetToken: z.string().min(32).max(200),
  password: z.string().min(6)
    .regex(/[A-Z]/, 'Password must include at least one uppercase letter.')
    .regex(/\d/, 'Password must include at least one number.'),
})

const resetAttemptWindowMs = 15 * 60 * 1000
const resetRequestsPerWindow = 3
const resetAttempts = new Map<string, { count: number; windowStart: number }>()

export async function authRoutes(app: FastifyInstance) {
  app.post('/password-reset/request', async (request, reply) => {
    const body = passwordResetEmailSchema.safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: 'validation_error', message: 'Enter a valid email address.' })

    const rateKey = `request:${request.ip}:${body.data.email}`
    if (!consumeResetAttempt(rateKey)) {
      return reply.status(429).send({ error: 'rate_limited', message: 'Please wait before requesting another code.' })
    }

    const [account] = await database
      .select({ id: users.id, email: users.email, fullName: profiles.fullName })
      .from(users)
      .leftJoin(profiles, eq(profiles.userId, users.id))
      .where(sql`lower(${users.email}) = ${body.data.email}`)
      .limit(1)

    if (account) {
      const otp = String(randomInt(0, 1_000_000)).padStart(6, '0')
      const [token] = await database.transaction(async (tx) => {
        await tx.update(verificationTokens).set({ usedAt: new Date() }).where(and(
          eq(verificationTokens.userId, account.id),
          eq(verificationTokens.purpose, 'password_reset'),
          isNull(verificationTokens.usedAt),
        ))
        return tx.insert(verificationTokens).values({
          userId: account.id,
          purpose: 'password_reset',
          tokenKind: 'otp',
          tokenHash: hashSessionToken(`password-reset-otp:${account.id}:${otp}`),
          expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        }).returning({ id: verificationTokens.id })
      })

      try {
        await sendPasswordResetOtpEmail({
          email: account.email,
          fullName: account.fullName ?? 'Mando user',
          otp,
          requestId: token.id,
        })
      } catch (error) {
        request.log.error(error, 'Password reset email failed')
      }
    }

    return reply.status(202).send({ message: 'If that email belongs to a Mando account, a verification code has been sent.' })
  })

  app.post('/password-reset/verify', async (request, reply) => {
    const body = passwordResetVerifySchema.safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: 'validation_error', message: 'Enter a valid email and 6-digit code.' })
    const rateKey = `verify:${request.ip}:${body.data.email}`
    if (!consumeResetAttempt(rateKey, 8)) {
      return reply.status(429).send({ error: 'rate_limited', message: 'Too many verification attempts. Request a new code.' })
    }

    const [account] = await database.select({ id: users.id }).from(users)
      .where(sql`lower(${users.email}) = ${body.data.email}`).limit(1)
    if (!account) return sendInvalidResetCode(reply)

    const [otpToken] = await database.select().from(verificationTokens).where(and(
      eq(verificationTokens.userId, account.id),
      eq(verificationTokens.purpose, 'password_reset'),
      eq(verificationTokens.tokenKind, 'otp'),
      isNull(verificationTokens.usedAt),
    )).orderBy(desc(verificationTokens.createdAt)).limit(1)

    if (!otpToken || otpToken.expiresAt <= new Date() || otpToken.attemptCount >= 5) {
      return sendInvalidResetCode(reply)
    }

    const suppliedHash = hashSessionToken(`password-reset-otp:${account.id}:${body.data.otp}`)
    if (!secureHashMatches(suppliedHash, otpToken.tokenHash)) {
      const nextAttempts = otpToken.attemptCount + 1
      await database.update(verificationTokens).set({
        attemptCount: nextAttempts,
        ...(nextAttempts >= 5 ? { usedAt: new Date() } : {}),
      }).where(eq(verificationTokens.id, otpToken.id))
      return sendInvalidResetCode(reply)
    }

    const rawResetToken = randomBytes(32).toString('base64url')
    await database.transaction(async (tx) => {
      await tx.update(verificationTokens).set({ usedAt: new Date() }).where(eq(verificationTokens.id, otpToken.id))
      await tx.insert(verificationTokens).values({
        userId: account.id,
        purpose: 'password_reset',
        tokenKind: 'reset',
        tokenHash: hashSessionToken(`password-reset-token:${rawResetToken}`),
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      })
    })
    return reply.status(200).send({ resetToken: rawResetToken, expiresInSeconds: 900 })
  })

  app.post('/password-reset/complete', async (request, reply) => {
    const body = passwordResetCompleteSchema.safeParse(request.body)
    if (!body.success) return reply.status(400).send({
      error: 'validation_error',
      message: body.error.issues[0]?.message ?? 'Enter a valid new password.',
    })

    const [account] = await database.select({ id: users.id }).from(users)
      .where(sql`lower(${users.email}) = ${body.data.email}`).limit(1)
    if (!account) return sendInvalidResetToken(reply)
    const resetTokenHash = hashSessionToken(`password-reset-token:${body.data.resetToken}`)
    const [resetToken] = await database.select({ id: verificationTokens.id }).from(verificationTokens).where(and(
      eq(verificationTokens.userId, account.id),
      eq(verificationTokens.purpose, 'password_reset'),
      eq(verificationTokens.tokenKind, 'reset'),
      eq(verificationTokens.tokenHash, resetTokenHash),
      isNull(verificationTokens.usedAt),
      gt(verificationTokens.expiresAt, new Date()),
    )).limit(1)
    if (!resetToken) return sendInvalidResetToken(reply)

    const passwordHash = await hashPassword(body.data.password)
    try {
      await database.transaction(async (tx) => {
        const [consumedToken] = await tx.update(verificationTokens).set({ usedAt: new Date() }).where(and(
          eq(verificationTokens.id, resetToken.id),
          isNull(verificationTokens.usedAt),
          gt(verificationTokens.expiresAt, new Date()),
        )).returning({ id: verificationTokens.id })
        if (!consumedToken) throw new ResetTokenAlreadyUsedError()

        await tx.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, account.id))
        await tx.update(verificationTokens).set({ usedAt: new Date() }).where(and(
          eq(verificationTokens.userId, account.id),
          eq(verificationTokens.purpose, 'password_reset'),
          isNull(verificationTokens.usedAt),
        ))
        await tx.update(authSessions).set({ revokedAt: new Date() }).where(and(
          eq(authSessions.userId, account.id),
          isNull(authSessions.revokedAt),
        ))
      })
    } catch (error) {
      if (error instanceof ResetTokenAlreadyUsedError) return sendInvalidResetToken(reply)
      throw error
    }

    return reply.status(204).header('Set-Cookie', serializeClearSessionCookie()).send()
  })

  app.post('/signup', async (request, reply) => {
    const parsedBody = signupBodySchema.safeParse(request.body)

    if (!parsedBody.success) {
      return reply.status(400).send({
        error: 'validation_error',
        message: 'Please check the signup details and try again.',
        issues: parsedBody.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      })
    }

    const { email, fullName, password, salesAgentId } = parsedBody.data
    const session = createSessionToken()

    try {
      const signupResult = await database.transaction(async (tx) => {
        const [existingUser] = await tx
          .select({
            id: users.id,
            email: users.email,
            passwordHash: users.passwordHash,
            status: users.status,
            createdAt: users.createdAt,
          })
          .from(users)
          .where(sql`lower(${users.email}) = ${email}`)
          .limit(1)

        const createdUser = existingUser ?? (
          await tx
            .insert(users)
            .values({
              email,
              passwordHash: await hashPassword(password),
            })
            .returning({
              id: users.id,
              email: users.email,
              passwordHash: users.passwordHash,
              status: users.status,
              createdAt: users.createdAt,
            })
        )[0]

        if (!createdUser) throw new Error('User creation failed.')

        if (existingUser && !(await verifyPassword(password, existingUser.passwordHash))) {
          throw new ExistingEmailPasswordMismatchError()
        }

        await tx
          .insert(profiles)
          .values({
            userId: createdUser.id,
            fullName,
          })
          .onConflictDoUpdate({
            target: profiles.userId,
            set: {
              fullName,
              updatedAt: new Date(),
            },
          })

        await tx
          .insert(userRoles)
          .values({
            userId: createdUser.id,
            role: 'customer',
          })
          .onConflictDoNothing()

        if (salesAgentId) {
          const [salesAgent] = await tx
            .select({
              userId: salesAgentProfiles.userId,
              referralCode: salesAgentProfiles.referralCode,
            })
            .from(salesAgentProfiles)
            .where(eq(salesAgentProfiles.userId, salesAgentId))
            .limit(1)

          if (salesAgent) {
            await tx
              .insert(referrals)
              .values({
                salesAgentId: salesAgent.userId,
                customerId: createdUser.id,
                referralCode: salesAgent.referralCode,
              })
              .onConflictDoNothing()
          }
        }

        await tx.insert(authSessions).values({
          userId: createdUser.id,
          activeRole: 'customer',
          tokenHash: session.tokenHash,
          expiresAt: session.expiresAt,
        })

        return {
          user: createdUser,
          profile: {
            fullName,
          },
          roles: await tx
            .select({ role: userRoles.role })
            .from(userRoles)
            .where(eq(userRoles.userId, createdUser.id))
            .then((roles) => roles.map((role) => role.role)),
        }
      })

      return reply
        .status(201)
        .header('Set-Cookie', serializeSessionCookie(session))
        .send(signupResult)
    } catch (error) {
      if (error instanceof ExistingEmailPasswordMismatchError) {
        return reply.status(409).send({
          error: 'email_password_mismatch',
          message: 'This email already exists. Enter the existing account password to add the customer role.',
        })
      }

      if (isUniqueViolation(error)) {
        return reply.status(409).send({
          error: 'email_already_exists',
          message: 'An account with this email already exists.',
        })
      }

      request.log.error(error)

      return reply.status(500).send({
        error: 'signup_failed',
        message: 'Signup failed. Please try again.',
      })
    }
  })

  app.post('/login', async (request, reply) => {
    const parsedBody = loginBodySchema.safeParse(request.body)

    if (!parsedBody.success) {
      return reply.status(400).send({
        error: 'validation_error',
        message: 'Please enter a valid email and password.',
        issues: parsedBody.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      })
    }

    const { email, password } = parsedBody.data
    const clientKey = request.ip ?? 'unknown'
    const attemptState = getLoginAttemptState(clientKey)

    if (attemptState.count >= loginAttemptsPerWindow) {
      return reply.status(429).send({
        error: 'rate_limited',
        message: 'Too many login attempts. Please wait a few minutes and try again.',
      })
    }

    try {
      const [existingUser] = await database
        .select({
          id: users.id,
          email: users.email,
          passwordHash: users.passwordHash,
          status: users.status,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(sql`lower(${users.email}) = ${email}`)
        .limit(1)

      if (!existingUser) {
        recordLoginFailure(clientKey)
        return sendInvalidLogin(reply)
      }

      const passwordMatches = await verifyPassword(
        password,
        existingUser.passwordHash,
      )

      if (!passwordMatches) {
        recordLoginFailure(clientKey)
        return sendInvalidLogin(reply)
      }

      if (
        existingUser.status === 'suspended' ||
        existingUser.status === 'disabled'
      ) {
        return reply.status(403).send({
          error: 'account_unavailable',
          message: 'This account is not available. Please contact support.',
        })
      }

      const session = createSessionToken()

      const loginResult = await database.transaction(async (tx) => {
        await tx.delete(authSessions).where(lt(authSessions.expiresAt, new Date()))

        await tx
          .update(authSessions)
          .set({ revokedAt: new Date() })
          .where(eq(authSessions.userId, existingUser.id))

        const assignedRoles = await tx
          .select({ role: userRoles.role })
          .from(userRoles)
          .where(eq(userRoles.userId, existingUser.id))

        const activeRole = assignedRoles.some(({ role }) => role === 'customer')
          ? 'customer'
          : assignedRoles[0]?.role

        if (!activeRole) throw new Error('User has no assigned role.')

        await tx.insert(authSessions).values({
          userId: existingUser.id,
          activeRole,
          tokenHash: session.tokenHash,
          expiresAt: session.expiresAt,
        })

        await tx
          .update(users)
          .set({ lastLoginAt: new Date() })
          .where(eq(users.id, existingUser.id))

        const [profile] = await tx
          .select({
            fullName: profiles.fullName,
            phone: profiles.phone,
            avatarUrl: profiles.avatarUrl,
          })
          .from(profiles)
          .where(eq(profiles.userId, existingUser.id))
          .limit(1)

        return {
          user: {
            id: existingUser.id,
            email: existingUser.email,
            status: existingUser.status,
            createdAt: existingUser.createdAt,
          },
          profile,
          roles: assignedRoles.map((userRole) => userRole.role),
          activeRole,
        }
      })

      resetLoginAttempts(clientKey)

      return reply
        .status(200)
        .header('Set-Cookie', serializeSessionCookie(session))
        .send(loginResult)
    } catch (error) {
      recordLoginFailure(clientKey)
      request.log.error(error)

      return reply.status(500).send({
        error: 'login_failed',
        message: 'Login failed. Please try again.',
      })
    }
  })

  app.get('/me', async (request, reply) => {
    try {
      const sessionContext = await getCurrentSessionContext(
        request.headers.cookie,
      )

      if (!sessionContext) {
        return sendUnauthenticated(reply)
      }

      const refreshedCookie = serializeRefreshedSessionCookie(
        request.headers.cookie,
      )
      if (refreshedCookie) reply.header('Set-Cookie', refreshedCookie)

      return reply.status(200).send(sessionContext.authPayload)
    } catch (error) {
      request.log.error(error)

      return reply.status(500).send({
        error: 'current_user_failed',
        message: 'Unable to load the current user.',
      })
    }
  })

  app.post('/select-role', async (request, reply) => {
    const parsedBody = selectRoleBodySchema.safeParse(request.body)
    if (!parsedBody.success) {
      return reply.status(400).send({
        error: 'validation_error',
        message: 'Select a valid account role.',
      })
    }

    const sessionContext = await getCurrentSessionContext(request.headers.cookie)
    if (!sessionContext) return sendUnauthenticated(reply)

    if (!sessionContext.authPayload.roles.includes(parsedBody.data.role)) {
      return reply.status(403).send({
        error: 'forbidden',
        message: 'This role is not assigned to your account.',
      })
    }

    await database
      .update(authSessions)
      .set({ activeRole: parsedBody.data.role })
      .where(eq(authSessions.id, sessionContext.sessionId))

    return reply.status(200).send({ activeRole: parsedBody.data.role })
  })

  app.post('/logout', async (request, reply) => {
    const token = getSessionTokenFromCookie(request.headers.cookie)

    if (token) {
      await database
        .update(authSessions)
        .set({ revokedAt: new Date() })
        .where(eq(authSessions.tokenHash, hashSessionToken(token)))
    }

    return reply
      .status(204)
      .header('Set-Cookie', serializeClearSessionCookie())
      .send()
  })

  app.post('/logout-all', async (request, reply) => {
    const sessionContext = await getCurrentSessionContext(request.headers.cookie)

    if (!sessionContext) {
      return sendUnauthenticated(reply)
    }

    await database
      .update(authSessions)
      .set({ revokedAt: new Date() })
      .where(eq(authSessions.userId, sessionContext.userId))

    return reply
      .status(204)
      .header('Set-Cookie', serializeClearSessionCookie())
      .send()
  })
}

function sendUnauthenticated(reply: FastifyReply) {
  return reply
    .status(401)
    .header('Set-Cookie', serializeClearSessionCookie())
    .send({
      error: 'unauthenticated',
      message: 'Please log in to continue.',
    })
}

function consumeResetAttempt(key: string, limit = resetRequestsPerWindow) {
  const now = Date.now()
  const current = resetAttempts.get(key)
  if (!current || now - current.windowStart >= resetAttemptWindowMs) {
    resetAttempts.set(key, { count: 1, windowStart: now })
    return true
  }
  if (current.count >= limit) return false
  current.count += 1
  return true
}

function sendInvalidResetCode(reply: FastifyReply) {
  return reply.status(400).send({
    error: 'invalid_reset_code',
    message: 'The verification code is invalid or has expired. Please request a new code.',
  })
}

function sendInvalidResetToken(reply: FastifyReply) {
  return reply.status(400).send({
    error: 'invalid_reset_token',
    message: 'This password reset session is invalid or has expired. Please start again.',
  })
}

function secureHashMatches(left: string, right: string) {
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer)
}

function getLoginAttemptState(clientKey: string) {
  const now = Date.now()
  const existing = loginAttempts.get(clientKey)

  if (!existing || existing.windowStart + loginAttemptWindowMs <= now) {
    return { count: 0 }
  }

  return existing
}

function recordLoginFailure(clientKey: string) {
  const now = Date.now()
  const existing = loginAttempts.get(clientKey)

  if (!existing || existing.windowStart + loginAttemptWindowMs <= now) {
    loginAttempts.set(clientKey, { count: 1, windowStart: now })
    return
  }

  loginAttempts.set(clientKey, {
    count: existing.count + 1,
    windowStart: existing.windowStart,
  })
}

function resetLoginAttempts(clientKey: string) {
  loginAttempts.delete(clientKey)
}

function sendInvalidLogin(reply: FastifyReply) {
  return reply.status(401).send({
    error: 'invalid_credentials',
    message: 'Invalid email or password.',
  })
}

function isUniqueViolation(error: unknown) {
  if (typeof error !== 'object' || error === null) {
    return false
  }

  if ('code' in error && error.code === '23505') {
    return true
  }

  if ('cause' in error) {
    return isUniqueViolation(error.cause)
  }

  return false
}

class ExistingEmailPasswordMismatchError extends Error {}
class ResetTokenAlreadyUsedError extends Error {}
