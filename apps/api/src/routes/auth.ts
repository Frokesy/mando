import type { FastifyInstance } from 'fastify'
import { z } from 'zod'

import {
  createSessionToken,
  hashPassword,
  serializeSessionCookie,
} from '../auth/index.js'
import { database } from '../db/client.js'
import { authSessions, profiles, userRoles, users } from '../db/schema.js'

const signupBodySchema = z.object({
  email: z.email().trim().toLowerCase(),
  fullName: z.string().trim().min(1).max(120),
  password: z
    .string()
    .min(6)
    .regex(/[A-Z]/, 'Password must include at least one uppercase letter.')
    .regex(/\d/, 'Password must include at least one number.'),
})

export async function authRoutes(app: FastifyInstance) {
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

    const { email, fullName, password } = parsedBody.data
    const session = createSessionToken()

    try {
      const signupResult = await database.transaction(async (tx) => {
        const [createdUser] = await tx
          .insert(users)
          .values({
            email,
            passwordHash: await hashPassword(password),
          })
          .returning({
            id: users.id,
            email: users.email,
            status: users.status,
            createdAt: users.createdAt,
          })

        if (!createdUser) {
          throw new Error('User creation failed.')
        }

        await tx.insert(profiles).values({
          userId: createdUser.id,
          fullName,
        })

        await tx.insert(userRoles).values({
          userId: createdUser.id,
          role: 'customer',
        })

        await tx.insert(authSessions).values({
          userId: createdUser.id,
          tokenHash: session.tokenHash,
          expiresAt: session.expiresAt,
        })

        return {
          user: createdUser,
          profile: {
            fullName,
          },
          roles: ['customer'],
        }
      })

      return reply
        .status(201)
        .header('Set-Cookie', serializeSessionCookie(session))
        .send(signupResult)
    } catch (error) {
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
