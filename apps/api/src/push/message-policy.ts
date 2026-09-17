import { createHash } from 'node:crypto'

// Expiry applies to push only: the in-app notification remains available.
export function pushMessagePolicy(type: string, createdAt: Date, now = new Date(), role = 'customer') {
  const reminder = type === 'sales_agent_daily_post_reminder'
  const lagosCreatedAt = new Date(createdAt.getTime() + 60 * 60_000)
  const expiresAt = reminder
    // Today's posting reminder must not become tomorrow's stale alert.
    ? new Date(Date.UTC(lagosCreatedAt.getUTCFullYear(), lagosCreatedAt.getUTCMonth(), lagosCreatedAt.getUTCDate(), 23))
    : new Date(createdAt.getTime() + 48 * 60 * 60_000)
  const ttl = Math.max(0, Math.ceil((expiresAt.getTime() - now.getTime()) / 1000))
  return {
    expiresAt,
    ttl,
    urgency: reminder ? 'normal' as const : 'high' as const,
    topic: reminder ? createHash('sha256').update(`${role}:${type}`).digest('base64url').slice(0, 32) : undefined,
  }
}
