"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import useNotificationStore from "@/store/notificationStore";

const API_BASE_URL =
  (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000").replace(/\/+$/, "");

type AdminNotification = {
  id: string;
  type: string;
  title: string;
  body: string;
  data: unknown;
  readAt: string | null;
  createdAt: string;
};

type NotificationResponse = {
  notifications: AdminNotification[];
  unreadCount: number;
  pagination: { page: number; limit: number; total: number; totalPages: number };
};

type StatusFilter = "all" | "unread" | "read";

export default function AdminNotificationsPage() {
  const [data, setData] = useState<NotificationResponse | null>(null);
  const [status, setStatus] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const setGlobalUnreadCount = useNotificationStore((state) => state.setUnreadCount);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const query = new URLSearchParams({ page: String(page), limit: "25", status });
      const response = await fetch(`${API_BASE_URL}/admin/notifications?${query}`, {
        credentials: "include",
        cache: "no-store",
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.message ?? "Unable to load admin notifications.");
      setData(result as NotificationResponse);
      setGlobalUnreadCount((result as NotificationResponse).unreadCount);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to load admin notifications.");
    } finally {
      setLoading(false);
    }
  }, [page, setGlobalUnreadCount, status]);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void loadNotifications(), 0);
    return () => window.clearTimeout(initialLoad);
  }, [loadNotifications]);

  async function markRead(notificationId: string) {
    const response = await fetch(`${API_BASE_URL}/admin/notifications/${notificationId}/read`, {
      method: "PATCH",
      credentials: "include",
    });
    if (!response.ok) return;
    const wasUnread = data?.notifications.some((notification) => notification.id === notificationId && !notification.readAt) ?? false;
    if (wasUnread) setGlobalUnreadCount(Math.max(0, (data?.unreadCount ?? 0) - 1));
    setData((current) => current ? {
      ...current,
      unreadCount: Math.max(0, current.unreadCount - 1),
      notifications: current.notifications.map((notification) =>
        notification.id === notificationId
          ? { ...notification, readAt: notification.readAt ?? new Date().toISOString() }
          : notification),
    } : current);
  }

  async function markAllRead() {
    const response = await fetch(`${API_BASE_URL}/admin/notifications/read-all`, {
      method: "POST",
      credentials: "include",
    });
    if (!response.ok) return;
    setGlobalUnreadCount(0);
    await loadNotifications();
  }

  function selectStatus(nextStatus: StatusFilter) {
    setStatus(nextStatus);
    setPage(1);
  }

  return (
    <div className="max-w-5xl pb-12 pr-0 sm:pr-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-[18px] font-semibold text-[#101828]">Notifications</h2>
          <p className="mt-1 text-[11px] text-[#667085]">Payout requests and operational updates requiring admin attention.</p>
        </div>
        <div className="min-w-20 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-center shadow-sm">
          <p className="text-[10px] text-[#98A2B3]">Unread</p>
          <p className="text-lg font-semibold text-[#101828]">{data?.unreadCount ?? 0}</p>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-2 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2 overflow-x-auto">
          {(["all", "unread", "read"] as const).map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => selectStatus(filter)}
              className={`shrink-0 rounded-xl px-4 py-2 text-[11px] font-semibold capitalize transition ${status === filter ? "bg-[#101828] text-white" : "text-[#667085] hover:bg-gray-50"}`}
            >
              {filter}
            </button>
          ))}
        </div>
        {(data?.unreadCount ?? 0) > 0 ? (
          <button type="button" onClick={() => void markAllRead()} className="px-3 pb-2 text-left text-[11px] font-semibold text-[#B77900] sm:pb-0">
            Mark all as read
          </button>
        ) : null}
      </div>

      {error ? <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-700">{error}</div> : null}

      <div className="mt-5 space-y-3">
        {loading ? Array.from({ length: 3 }).map((_, index) => <div key={index} className="h-28 animate-pulse rounded-2xl border border-gray-200 bg-white" />) : null}
        {!loading && !data?.notifications.length ? <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center"><div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-gray-100 text-xl">🔔</div><h3 className="text-sm font-semibold text-[#101828]">You’re all caught up</h3><p className="mt-1 text-xs text-[#667085]">No notifications match this filter.</p></div> : null}
        {!loading && data?.notifications.map((notification) => {
          const href = notificationUrl(notification.data);
          return (
            <article key={notification.id} className={`rounded-2xl border p-5 shadow-sm ${notification.readAt ? "border-gray-200 bg-white" : "border-amber-200 bg-amber-50/40"}`}>
              <div className="flex items-start justify-between gap-5">
                <div className="min-w-0">
                  <div className="mb-2 flex items-center gap-2"><span className="rounded-full bg-white/80 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#667085]">{notificationLabel(notification.type)}</span>{!notification.readAt ? <span className="text-[10px] font-semibold uppercase tracking-wide text-[#B77900]">New</span> : null}</div>
                  <div className="flex items-center gap-2">
                    {!notification.readAt ? <span className="h-2 w-2 shrink-0 rounded-full bg-red-500" /> : null}
                    <h3 className="text-sm font-semibold text-[#101828]">{notification.title}</h3>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-[#667085]">{notification.body}</p>
                  <p className="mt-2 text-[10px] text-[#98A2B3]">{formatDate(notification.createdAt)}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  {!notification.readAt ? (
                    <button type="button" onClick={() => void markRead(notification.id)} className="text-[10px] font-semibold text-[#B77900]">Mark read</button>
                  ) : null}
                  {href ? <Link href={href} onClick={() => void markRead(notification.id)} className="rounded-lg bg-[#101828] px-3 py-2 text-[10px] font-semibold text-white">View</Link> : null}
                </div>
              </div>
            </article>
          );
        })}
        <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white px-5 py-4 text-[10px] text-[#667085] shadow-sm">
          <span>Page {data?.pagination.page ?? page} of {data?.pagination.totalPages ?? 1}</span>
          <div className="flex gap-2">
            <button type="button" disabled={page <= 1 || loading} onClick={() => setPage((value) => Math.max(1, value - 1))} className="rounded border border-gray-200 px-3 py-1.5 disabled:opacity-40">Previous</button>
            <button type="button" disabled={page >= (data?.pagination.totalPages ?? 1) || loading} onClick={() => setPage((value) => value + 1)} className="rounded border border-gray-200 px-3 py-1.5 disabled:opacity-40">Next</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function notificationUrl(data: unknown) {
  if (!data || typeof data !== "object" || !("url" in data)) return null;
  const url = (data as { url?: unknown }).url;
  return typeof url === "string" && url.startsWith("/admin/dashboard/") ? url : null;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function notificationLabel(type: string) {
  const normalized = type.toLowerCase();
  if (normalized.includes("payout")) return "Payout";
  if (normalized.includes("payment")) return "Payment";
  if (normalized.includes("deliver") || normalized.includes("rider")) return "Delivery";
  if (normalized.includes("order")) return "Order";
  if (normalized.includes("account") || normalized.includes("security")) return "Account";
  if (normalized.includes("support")) return "Support";
  return "Operations";
}
