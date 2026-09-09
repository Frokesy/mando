export const MAX_PUSH_ATTEMPTS = 5
const BASE_RETRY_DELAY_MS = 60_000
const MAX_RETRY_DELAY_MS = 60 * 60_000

const INVALID_SUBSCRIPTION_STATUSES = new Set([400, 401, 403, 404, 410])

export type PushFailureDecision =
  | { status: 'invalid_subscription'; retryAt: null }
  | { status: 'failed'; retryAt: null }
  | { status: 'retrying'; retryAt: Date }

export function pushFailureDecision(attemptCount: number, responseStatus: number | null, now = new Date()): PushFailureDecision {
  if (responseStatus !== null && INVALID_SUBSCRIPTION_STATUSES.has(responseStatus)) {
    return { status: 'invalid_subscription', retryAt: null }
  }
  if (attemptCount >= MAX_PUSH_ATTEMPTS) return { status: 'failed', retryAt: null }

  const delay = Math.min(BASE_RETRY_DELAY_MS * (2 ** Math.max(0, attemptCount - 1)), MAX_RETRY_DELAY_MS)
  return { status: 'retrying', retryAt: new Date(now.getTime() + delay) }
}

export function pushResponseStatus(error: unknown) {
  if (!error || typeof error !== 'object' || !('statusCode' in error)) return null
  const status = Number(error.statusCode)
  return Number.isInteger(status) && status >= 100 && status <= 599 ? status : null
}

export function safePushFailureReason(error: unknown) {
  const message = error instanceof Error ? error.message : 'Push delivery failed'
  return message.replace(/https?:\/\/\S+/gi, '[push endpoint]').slice(0, 500)
}
