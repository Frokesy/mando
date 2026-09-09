"use client";

import { useCallback, useEffect, useState } from "react";

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000").replace(/\/+$/, "");

type DeliveryStats = {
  periodDays: number;
  volume: { total: number; byRole: Record<string, number>; byCategory: Record<string, number> };
  delivery: { sent: number; delivered: number; failed: number; pending: number; suppressed: number };
  subscriptions: { active: number; inactive: number; invalid: number };
  failures: Array<{ id: string; status: string; attemptCount: number; responseStatus: number | null; failureReason: string | null; attemptedAt: string; notificationTitle: string; role: string; retryEligible: boolean }>;
};

export default function NotificationDeliveryPage() {
  const [stats, setStats] = useState<DeliveryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await fetch(`${API_BASE_URL}/admin/notification-delivery/stats`, { credentials: "include", cache: "no-store" });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.message ?? "Unable to load notification delivery health.");
      setStats(result as DeliveryStats);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to load delivery health."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);

  async function retry(id: string) {
    setRetryingId(id);
    try {
      const response = await fetch(`${API_BASE_URL}/admin/notification-delivery/${id}/retry`, { method: "POST", credentials: "include" });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.message ?? "Unable to retry delivery.");
      await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to retry delivery."); }
    finally { setRetryingId(null); }
  }

  return (
    <div className="max-w-6xl pb-12 pr-0 sm:pr-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[11px] font-semibold uppercase tracking-wide text-[#B77900]">Last 30 days</p><h1 className="mt-1 text-xl font-semibold text-[#101828]">Notification delivery health</h1><p className="mt-1 text-xs text-[#667085]">Push volume, delivery outcomes, subscriptions, and safe retries.</p></div><button type="button" onClick={() => void load()} disabled={loading} className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-[#344054] disabled:opacity-50">{loading ? "Refreshing…" : "Refresh"}</button></header>
      {error ? <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-700">{error}</div> : null}
      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5"><Metric label="Notifications created" value={stats?.volume.total} /><Metric label="Sent / attempted" value={stats?.delivery.sent} /><Metric label="Delivered" value={stats?.delivery.delivered} tone="good" /><Metric label="Failed" value={stats?.delivery.failed} tone="bad" /><Metric label="Pending / retrying" value={stats?.delivery.pending} /></div>
      <div className="mt-4 grid gap-4 lg:grid-cols-3"><Breakdown title="Volume by role" values={stats?.volume.byRole} /><Breakdown title="Volume by category" values={stats?.volume.byCategory} /><section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"><h2 className="text-sm font-semibold text-[#101828]">Subscriptions</h2><div className="mt-4 space-y-3"><Row label="Active" value={stats?.subscriptions.active ?? 0} /><Row label="Inactive for 30+ days" value={stats?.subscriptions.inactive ?? 0} /><Row label="Invalidated" value={stats?.subscriptions.invalid ?? 0} /></div></section></div>
      <section className="mt-5 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"><div className="border-b border-gray-100 p-5"><h2 className="text-sm font-semibold text-[#101828]">Recent final failures</h2><p className="mt-1 text-[11px] text-[#667085]">Subscription endpoints and credentials are never displayed.</p></div><div className="overflow-x-auto"><table className="min-w-full text-left text-xs"><thead className="bg-gray-50 text-[10px] uppercase tracking-wide text-[#667085]"><tr><th className="p-4">Notification</th><th className="p-4">Role</th><th className="p-4">Attempts</th><th className="p-4">Reason</th><th className="p-4">Action</th></tr></thead><tbody className="divide-y divide-gray-100">{stats?.failures.length ? stats.failures.map((failure) => <tr key={failure.id}><td className="p-4 font-semibold text-[#101828]">{failure.notificationTitle}<span className="mt-1 block font-normal text-[#98A2B3]">{new Date(failure.attemptedAt).toLocaleString("en-NG")}</span></td><td className="p-4 capitalize text-[#667085]">{failure.role.replace("_", " ")}</td><td className="p-4 text-[#667085]">{failure.attemptCount}</td><td className="max-w-xs p-4 text-[#667085]">{failure.responseStatus ? `HTTP ${failure.responseStatus}: ` : ""}{failure.failureReason ?? failure.status}</td><td className="p-4">{failure.status === "failed" && failure.retryEligible ? <button type="button" disabled={retryingId === failure.id} onClick={() => void retry(failure.id)} className="rounded-lg bg-[#101828] px-3 py-2 text-[10px] font-semibold text-white disabled:opacity-50">{retryingId === failure.id ? "Queuing…" : "Retry"}</button> : <span className="text-[10px] text-[#98A2B3]">Not retryable</span>}</td></tr>) : <tr><td colSpan={5} className="p-10 text-center text-[#667085]">No final delivery failures in this period.</td></tr>}</tbody></table></div></section>
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value?: number; tone?: "good" | "bad" }) { return <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"><p className="text-[11px] text-[#667085]">{label}</p><p className={`mt-2 text-2xl font-semibold ${tone === "good" ? "text-green-600" : tone === "bad" ? "text-red-600" : "text-[#101828]"}`}>{value ?? "—"}</p></div>; }
function Row({ label, value }: { label: string; value: number }) { return <div className="flex items-center justify-between"><span className="text-xs text-[#667085]">{label}</span><span className="text-sm font-semibold text-[#101828]">{value}</span></div>; }
function Breakdown({ title, values }: { title: string; values?: Record<string, number> }) { const entries = Object.entries(values ?? {}); return <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"><h2 className="text-sm font-semibold text-[#101828]">{title}</h2><div className="mt-4 space-y-3">{entries.length ? entries.map(([label, value]) => <Row key={label} label={label.replace("_", " ")} value={value} />) : <p className="text-xs text-[#98A2B3]">No activity yet.</p>}</div></section>; }
