export const READ_NOTIFICATION_RETENTION_DAYS = 90
export const UNREAD_NOTIFICATION_RETENTION_DAYS = 180

export function notificationRetentionPolicy() {
  return { readDays: READ_NOTIFICATION_RETENTION_DAYS, unreadDays: UNREAD_NOTIFICATION_RETENTION_DAYS }
}
