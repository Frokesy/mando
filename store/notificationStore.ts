import create from "zustand";

export type Notification = {
  id: string;
  type: string;
  title: string;
  body: string;
  data?: unknown;
  readAt: string | null;
  createdAt: string;
};

type NotificationState = {
  notifications: Notification[];
  unreadCount: number;
  setNotifications: (notifications: Notification[]) => void;
  setUnreadCount: (count: number) => void;
  addNotification: (notification: Notification) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
};

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,
  setNotifications: (notifications) => set({ notifications }),
  setUnreadCount: (count) => set({ unreadCount: Math.max(0, count) }),
  addNotification: (notification) =>
    set((state) => ({
      notifications: [notification, ...state.notifications],
      unreadCount: state.unreadCount + (notification.readAt ? 0 : 1),
    })),
  markRead: (id) =>
    set((state) => {
      const wasUnread = state.notifications.some((notification) => notification.id === id && !notification.readAt);
      return {
      notifications: state.notifications.map((notification) =>
        notification.id === id
          ? { ...notification, readAt: notification.readAt ?? new Date().toISOString() }
          : notification,
      ),
      unreadCount: wasUnread ? Math.max(0, state.unreadCount - 1) : state.unreadCount,
    }; }),
  markAllRead: () =>
    set((state) => ({
      notifications: state.notifications.map((notification) => ({
        ...notification,
        readAt: notification.readAt ?? new Date().toISOString(),
      })), unreadCount: 0,
    })),
}));

export default useNotificationStore;
