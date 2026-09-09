"use client";

import { useCallback, useEffect } from "react";
import useNotificationStore from "@/store/notificationStore";

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000").replace(/\/+$/, "");
const REFRESH_INTERVAL_MS = 60_000;

export default function useUnreadNotificationCount() {
  const unreadCount = useNotificationStore((state) => state.unreadCount);
  const setUnreadCount = useNotificationStore((state) => state.setUnreadCount);

  const refresh = useCallback(async () => {
    if (document.visibilityState === "hidden") return;
    try {
      const response = await fetch(`${API_BASE_URL}/push/unread-count`, { credentials: "include", cache: "no-store" });
      if (!response.ok) return;
      const result = (await response.json()) as { unreadCount?: number };
      if (typeof result.unreadCount === "number") setUnreadCount(result.unreadCount);
    } catch {
      // Keep the last known count while offline or between deployments.
    }
  }, [setUnreadCount]);

  useEffect(() => {
    void refresh();
    const interval = window.setInterval(() => void refresh(), REFRESH_INTERVAL_MS);
    const refreshWhenVisible = () => { if (document.visibilityState === "visible") void refresh(); };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [refresh]);

  return unreadCount;
}
