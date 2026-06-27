import type { FastifyInstance, FastifyReply } from 'fastify'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

import { getCurrentSessionContext } from '../auth/current-session.js'
import { serializeClearSessionCookie } from '../auth/index.js'
import { database } from '../db/client.js'
import { profiles } from '../db/schema.js'

const updateProfileBodySchema = z
  .object({
    fullName: z.string().trim().min(1).max(120).optional(),
    phone: z.string().trim().min(1).max(40).nullable().optional(),
    birthday: z.string().date().nullable().optional(),
    avatarUrl: z.url().nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one profile field to update.',
  })

type ProfileUpdateValues = {
  fullName?: string
  phone?: string | null
  birthday?: string | null
  avatarUrl?: string | null
  updatedAt: Date
}

export async function customerRoutes(app: FastifyInstance) {
  app.patch('/profile', async (request, reply) => {
    const sessionContext = await getCurrentSessionContext(request.headers.cookie)

    if (!sessionContext) {
      return sendUnauthenticated(reply)
    }

    const parsedBody = updateProfileBodySchema.safeParse(request.body)

    if (!parsedBody.success) {
      return reply.status(400).send({
        error: 'validation_error',
        message: 'Please check the profile details and try again.',
        issues: parsedBody.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      })
    }

    const updates = parsedBody.data
    const values: ProfileUpdateValues = {
      updatedAt: new Date(),
    }

    if (updates.fullName !== undefined) {
      values.fullName = updates.fullName
    }

    if (updates.phone !== undefined) {
      values.phone = updates.phone
    }

    if (updates.birthday !== undefined) {
      values.birthday = updates.birthday
    }

    if (updates.avatarUrl !== undefined) {
      values.avatarUrl = updates.avatarUrl
    }

    const [updatedProfile] = await database
      .update(profiles)
      .set(values)
      .where(eq(profiles.userId, sessionContext.userId))
      .returning({
        fullName: profiles.fullName,
        phone: profiles.phone,
        birthday: profiles.birthday,
        avatarUrl: profiles.avatarUrl,
      })

    return reply.status(200).send({
      user: sessionContext.authPayload.user,
      profile: updatedProfile,
      roles: sessionContext.authPayload.roles,
    })
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
