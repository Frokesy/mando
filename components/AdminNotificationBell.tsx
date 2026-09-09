"use client";

import Link from "next/link";
import { NotificationIcon } from "@/components/svgs/DefaultIcons";
import useUnreadNotificationCount from "@/hooks/useUnreadNotificationCount";

export default function AdminNotificationBell() {
  const unreadCount = useUnreadNotificationCount();

  return (
    <Link
      href="/admin/dashboard/notifications"
      aria-label={`${unreadCount} unread notifications`}
      className="relative flex h-[32px] w-[32px] items-center justify-center rounded-full bg-[#FFB900] text-white"
    >
      <NotificationIcon size={16} />
      {unreadCount > 0 ? (
        <span className="absolute -right-2 -top-2 min-w-5 rounded-full bg-red-600 px-1.5 py-0.5 text-center text-[9px] font-bold text-white">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      ) : null}
    </Link>
  );
}
