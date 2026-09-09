import { and, eq } from 'drizzle-orm'

import { database } from '../db/client.js'
import { notificationPreferences, userRoleEnum } from '../db/schema.js'

export const notificationCategories = ['orders', 'payments', 'delivery', 'payouts', 'marketing', 'account', 'support'] as const
export type NotificationCategory = typeof notificationCategories[number]
export type NotificationRole = typeof userRoleEnum.enumValues[number]
export type CategoryPreference = { push: boolean; inApp: boolean }
export type CategoryPreferences = Record<NotificationCategory, CategoryPreference>

export const defaultCategoryPreferences = Object.fromEntries(
  notificationCategories.map((category) => [category, { push: true, inApp: true }]),
) as CategoryPreferences

export function notificationCategory(type: string): NotificationCategory {
  if (type.includes('payout') || type.includes('commission')) return 'payouts'
  if (type.includes('payment') || type.includes('refund')) return 'payments'
  if (type.includes('issue') || type.includes('rejected')) return 'support'
  if (type.includes('rider') || type.includes('pickup') || type.includes('delivered')) return 'delivery'
  if (type.includes('order') || type.includes('restaurant_new')) return 'orders'
  if (type.includes('account') || type.includes('status') || type.includes('tier') || type === 'push_enabled') return 'account'
  return 'marketing'
}

export function isCriticalNotification(type: string) {
  return notificationCategory(type) === 'payments' ||
    type.includes('payout_reviewed') ||
    type.includes('account_approved') ||
    type.includes('status_changed')
}

export function mergeCategoryPreferences(value: unknown): CategoryPreferences {
  const input = value && typeof value === 'object' ? value as Record<string, unknown> : {}
  return Object.fromEntries(notificationCategories.map((category) => {
    const categoryInput = input[category]
    const parsed = categoryInput && typeof categoryInput === 'object'
      ? categoryInput as Partial<CategoryPreference>
      : {}
    return [category, {
      push: typeof parsed.push === 'boolean' ? parsed.push : true,
      inApp: typeof parsed.inApp === 'boolean' ? parsed.inApp : true,
    }]
  })) as CategoryPreferences
}

export async function getNotificationPreferences(userId: string, role: NotificationRole) {
  const [stored] = await database.select().from(notificationPreferences).where(and(
    eq(notificationPreferences.userId, userId),
    eq(notificationPreferences.role, role),
  )).limit(1)

  return {
    pushEnabled: stored?.pushEnabled ?? true,
    inAppEnabled: stored?.inAppEnabled ?? true,
    categories: mergeCategoryPreferences(stored?.categories),
    quietHoursEnabled: stored?.quietHoursEnabled ?? false,
    quietHoursStart: stored?.quietHoursStart ?? '22:00',
    quietHoursEnd: stored?.quietHoursEnd ?? '07:00',
  }
}

export function notificationAllowed(
  type: string,
  channel: 'push' | 'inApp',
  preferences: Awaited<ReturnType<typeof getNotificationPreferences>>,
) {
  if (isCriticalNotification(type)) return true
  if (channel === 'push' && !preferences.pushEnabled) return false
  if (channel === 'inApp' && !preferences.inAppEnabled) return false
  return preferences.categories[notificationCategory(type)][channel]
}

export async function filterInAppNotifications<T extends { type: string }>(
  rows: T[],
  userId: string,
  role: NotificationRole,
) {
  const preferences = await getNotificationPreferences(userId, role)
  return rows.filter((row) => notificationAllowed(row.type, 'inApp', preferences))
}

export function isLagosQuietTime(now: Date, enabled: boolean, start: string, end: string) {
  if (!enabled || start === end) return false
  const lagos = new Date(now.getTime() + 60 * 60 * 1000)
  const minutes = lagos.getUTCHours() * 60 + lagos.getUTCMinutes()
  const startMinutes = parseTime(start)
  const endMinutes = parseTime(end)
  if (startMinutes < endMinutes) return minutes >= startMinutes && minutes < endMinutes
  return minutes >= startMinutes || minutes < endMinutes
}

function parseTime(value: string) {
  const [hours = '0', minutes = '0'] = value.split(':')
  return Number(hours) * 60 + Number(minutes)
}
