"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeftIcon } from "@/components/svgs/DefaultIcons";
import useNotificationStore, { Notification } from "@/store/notificationStore";
import { useToastStore } from "@/store/toastStore";
import { notificationHref } from "@/lib/notificationLinks";
import useOnlineStatus from "@/hooks/useOnlineStatus";

const API_BASE_URL =
  (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000").replace(/\/+$/, "");

type Filter = "all" | "unread" | "read" | "today";

type RoleNotificationsPageProps = {
  apiPrefix: string;
  backHref: string;
  bottomNav?: React.ReactNode;
};

const filters: { label: string; value: Filter }[] = [
  { label: "All", value: "all" },
  { label: "Unread", value: "unread" },
  { label: "Read", value: "read" },
  { label: "Today", value: "today" },
];

export default function RoleNotificationsPage({
  apiPrefix,
  backHref,
  bottomNav,
}: RoleNotificationsPageProps) {
  const notifications = useNotificationStore((s) => s.notifications);
  const setNotifications = useNotificationStore((s) => s.setNotifications);
  const markRead = useNotificationStore((s) => s.markRead);
  const markAllRead = useNotificationStore((s) => s.markAllRead);
  const setUnreadCount = useNotificationStore((s) => s.setUnreadCount);
  const showToast = useToastStore((s) => s.showToast);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<Filter>("all");
  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [error, setError] = useState("");
  const online = useOnlineStatus();
  const unreadCount = useNotificationStore((s) => s.unreadCount);

  useEffect(() => {
    let mounted = true;

    const query = new URLSearchParams({ page: String(page), limit: "20", status: activeFilter });
    fetch(`${API_BASE_URL}/push/notifications?${query}`, {
      credentials: "include",
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load notifications");
        return response.json() as Promise<{ notifications: Notification[]; unreadCount: number; pagination: typeof pagination }>;
      })
      .then((data) => {
        if (mounted) {
          setError("");
          setNotifications(data.notifications);
          setUnreadCount(data.unreadCount);
          setPagination(data.pagination);
        }
      })
      .catch((error) => {
        if (mounted) {
          setError(error instanceof Error ? error.message : "Unable to load notifications");
          showToast(error instanceof Error ? error.message : "Unable to load notifications", "error");
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [activeFilter, page, refreshKey, setNotifications, setUnreadCount, showToast]);

  async function markNotificationRead(notificationId: string) {
    markRead(notificationId);
    await fetch(`${API_BASE_URL}/${apiPrefix}/notifications/${notificationId}/read`, {
      method: "PATCH",
      credentials: "include",
    });
    setRefreshKey((value) => value + 1);
  }

  async function markEveryNotificationRead() {
    markAllRead();
    await fetch(`${API_BASE_URL}/${apiPrefix}/notifications/read-all`, {
      method: "POST",
      credentials: "include",
    });
    setPage(1);
    setRefreshKey((value) => value + 1);
  }

  return (
    <div className="min-h-screen bg-[#F8F8F8] pb-28">
      <div className="mx-auto max-w-3xl p-4 sm:p-6">
        <header className="mb-6 flex items-center gap-3">
          <Link
            href={backHref}
            className="inline-flex h-10 w-10 items-center justify-center rounded-md text-[#4D4D4D]"
          >
            <ArrowLeftIcon />
          </Link>
          <div>
            <h1 className="text-2xl font-semibold text-[#141B34]">Notifications</h1>
            <p className="text-sm text-[#6B6B6B]">{pagination.total} updates in this view</p>
          </div>
          {unreadCount > 0 ? (
            <button
              type="button"
              onClick={() => void markEveryNotificationRead()}
              className="ml-auto text-xs font-semibold text-[#DFB400]"
            >
              Mark all read
            </button>
          ) : null}
        </header>

        <div className="mb-5 flex items-center gap-2 overflow-x-auto rounded-2xl border border-gray-200 bg-white p-2 shadow-sm">
          {filters.map((filter) => (
            <button
              key={filter.value}
              type="button"
              onClick={() => { setError(""); setLoading(true); setActiveFilter(filter.value); setPage(1); }}
              className={`shrink-0 rounded-xl px-4 py-2 text-sm font-semibold transition ${
                activeFilter === filter.value
                  ? "bg-[#141B34] text-white"
                  : "border border-gray-200 bg-white text-[#6B6B6B]"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {!online ? <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">You’re offline. Showing the last notifications loaded on this device.</div> : null}
        {error ? <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"><span>{error}</span><button type="button" onClick={() => { setLoading(true); setRefreshKey((value) => value + 1); }} className="font-semibold">Retry</button></div> : null}

        <div className="space-y-3">
          {loading ? (
            Array.from({ length: 3 }).map((_, index) => <div key={index} className="h-32 animate-pulse rounded-2xl border border-gray-200 bg-white" />)
          ) : null}

          {!loading && notifications.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-5 py-12 text-center"><div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-gray-100 text-xl">🔔</div><h2 className="font-semibold text-[#141B34]">You’re all caught up</h2><p className="mt-1 text-sm text-[#6B6B6B]">No notifications match this filter.</p></div>
          ) : null}

          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`rounded-2xl border px-5 py-4 shadow-sm transition ${
                notification.readAt ? "border-gray-200 bg-white opacity-80" : "border-amber-200 bg-amber-50/40"
              }`}
            >
              <div className="mb-2 flex items-center gap-2"><span className="rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-gray-600">{notificationLabel(notification.type)}</span>{!notification.readAt ? <span className="text-[10px] font-semibold uppercase tracking-wide text-[#B77900]">New</span> : null}</div>
              <div className="flex items-start justify-between gap-4">
                <h2 className="text-base font-semibold text-[#141B34]">{notification.title}</h2>
                {!notification.readAt ? <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-[#DFB400]" /> : null}
              </div>
              <p className="mt-2 text-sm text-[#6B6B6B]">{notification.body}</p>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-xs text-[#A4A4A4]">{formatNotificationTime(notification.createdAt)}</span>
                {!notification.readAt ? (
                  <button
                    type="button"
                    onClick={() => void markNotificationRead(notification.id)}
                    className="text-xs font-semibold text-[#DFB400]"
                  >
                    Mark read
                  </button>
                ) : null}
                <Link href={notificationHref(notification.data, apiPrefix)} onClick={() => { if (!notification.readAt) void markNotificationRead(notification.id); }} className="ml-3 text-xs font-semibold text-[#141B34]">Open</Link>
              </div>
            </div>
          ))}
          {!loading && pagination.total > 0 ? (
            <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white px-4 py-3 text-xs text-[#6B6B6B] shadow-sm">
              <span>Page {pagination.page} of {pagination.totalPages}</span>
              <div className="flex gap-2">
                <button type="button" disabled={page <= 1} onClick={() => { setLoading(true); setPage((value) => Math.max(1, value - 1)); }} className="rounded-lg border border-gray-200 px-3 py-2 font-semibold text-[#141B34] disabled:opacity-40">Previous</button>
                <button type="button" disabled={page >= pagination.totalPages} onClick={() => { setLoading(true); setPage((value) => value + 1); }} className="rounded-lg border border-gray-200 px-3 py-2 font-semibold text-[#141B34] disabled:opacity-40">Next</button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
      {bottomNav}
    </div>
  );
}

function formatNotificationTime(value: string) {
  return new Intl.DateTimeFormat("en-NG", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function notificationLabel(type: string) {
  const normalized = type.toLowerCase();
  if (normalized.includes("payout")) return "Payout";
  if (normalized.includes("payment")) return "Payment";
  if (normalized.includes("deliver") || normalized.includes("rider")) return "Delivery";
  if (normalized.includes("order")) return "Order";
  if (normalized.includes("account") || normalized.includes("security")) return "Account";
  if (normalized.includes("support")) return "Support";
  return "Update";
}
