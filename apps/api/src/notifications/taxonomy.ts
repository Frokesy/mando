export const notificationCategories = ['orders', 'payments', 'delivery', 'payouts', 'marketing', 'account', 'support'] as const
export type NotificationCategory = typeof notificationCategories[number]

export function notificationCategory(type: string): NotificationCategory {
  if (type.includes('payout') || type.includes('commission')) return 'payouts'
  if (type.includes('payment') || type.includes('refund')) return 'payments'
  if (type.includes('issue') || type.includes('rejected')) return 'support'
  if (type.includes('rider') || type.includes('pickup') || type.includes('delivered')) return 'delivery'
  if (type.includes('order') || type.includes('restaurant_new')) return 'orders'
  if (type.includes('account') || type.includes('status') || type.includes('tier') || type === 'push_enabled') return 'account'
  return 'marketing'
}
