"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { NotificationIcon } from "@/components/svgs/DefaultIcons";

const API_BASE_URL =
  (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000").replace(/\/+$/, "");

export default function AdminNotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let mounted = true;
    const refresh = () => {
      void fetch(`${API_BASE_URL}/admin/notifications?page=1&limit=1&status=unread`, {
        credentials: "include",
        cache: "no-store",
      }).then((response) => response.ok ? response.json() : null)
        .then((result: { unreadCount?: number } | null) => {
          if (mounted && result) setUnreadCount(result.unreadCount ?? 0);
        }).catch(() => undefined);
    };
    refresh();
    const interval = window.setInterval(refresh, 30_000);
    return () => { mounted = false; window.clearInterval(interval); };
  }, []);

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
