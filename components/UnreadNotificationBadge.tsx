"use client";

import useUnreadNotificationCount from "@/hooks/useUnreadNotificationCount";

export default function UnreadNotificationBadge() {
  const count = useUnreadNotificationCount();
  if (count <= 0) return null;
  return <span className="absolute -right-2 -top-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[9px] font-bold text-white ring-2 ring-white">{count > 99 ? "99+" : count}</span>;
}
