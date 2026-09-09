import { notificationCategory } from './taxonomy.js'

export function notificationPresentation(type: string, title: string, body: string) {
  return {
    category: notificationCategory(type),
    title: title.trim().slice(0, 100) || 'Mando update',
    body: body.trim().slice(0, 300) || 'You have a new update from Mando.',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
  }
}
