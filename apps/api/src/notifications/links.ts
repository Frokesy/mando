import type { NotificationRole } from './preferences.js'

const rolePrefixes: Record<NotificationRole, string> = {
  customer: '/customer/',
  rider: '/rider/',
  sales_agent: '/sales-agent/',
  restaurant: '/restaurant/',
  admin: '/admin/dashboard/',
}

export function notificationFallbackUrl(role: NotificationRole) {
  return role === 'admin' ? '/admin/dashboard/notifications' : `${rolePrefixes[role]}notifications`
}

export function safeNotificationUrl(role: NotificationRole, value: unknown) {
  if (typeof value !== 'string' || !value.startsWith(rolePrefixes[role]) || value.startsWith('//')) {
    return notificationFallbackUrl(role)
  }
  return value
}
