"use client";

import { useEffect, useState } from "react";
import { useToastStore } from "@/store/toastStore";

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000").replace(/\/+$/, "");
const categories = ["orders", "payments", "delivery", "payouts", "marketing", "account", "support"] as const;
type Category = typeof categories[number];
type Preferences = {
  pushEnabled: boolean;
  inAppEnabled: boolean;
  categories: Record<Category, { push: boolean; inApp: boolean }>;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
};

const categoryDetails: Record<Category, { label: string; description: string }> = {
  orders: { label: "Orders", description: "New orders and order status changes" },
  payments: { label: "Payments", description: "Payment confirmations and issues" },
  delivery: { label: "Delivery", description: "Pickup and delivery progress" },
  payouts: { label: "Payouts", description: "Withdrawal and payout updates" },
  marketing: { label: "Marketing", description: "Promotions, reminders, and product news" },
  account: { label: "Account", description: "Security and account activity" },
  support: { label: "Support", description: "Messages and support updates" },
};

export default function NotificationPreferencesControl() {
  const showToast = useToastStore((state) => state.showToast);
  const [preferences, setPreferences] = useState<Preferences | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    void fetch(`${API_BASE_URL}/push/preferences`, { credentials: "include", cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load notification preferences");
        return response.json() as Promise<{ preferences: Preferences }>;
      })
      .then((result) => { if (active) setPreferences(result.preferences); })
      .catch((error) => { if (active) showToast(error instanceof Error ? error.message : "Unable to load preferences", "error"); });
    return () => { active = false; };
  }, [showToast]);

  const updateCategory = (category: Category, channel: "push" | "inApp", enabled: boolean) => {
    setPreferences((current) => current ? {
      ...current,
      categories: { ...current.categories, [category]: { ...current.categories[category], [channel]: enabled } },
    } : current);
  };

  async function save() {
    if (!preferences) return;
    setSaving(true);
    try {
      const response = await fetch(`${API_BASE_URL}/push/preferences`, {
        method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(preferences),
      });
      if (!response.ok) throw new Error("Unable to save notification preferences");
      showToast("Notification preferences saved", "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Unable to save preferences", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <details className="group overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-4 transition hover:bg-gray-50 [&::-webkit-details-marker]:hidden sm:px-5">
        <span className="flex min-w-0 items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-50 text-[#9A7C00]">
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15.75A3.75 3.75 0 1 0 12 8.25a3.75 3.75 0 0 0 0 7.5Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12a7.5 7.5 0 0 0-.1-1.22l2.02-1.58-2-3.46-2.5 1a7.57 7.57 0 0 0-2.1-1.22L14.45 3h-4.9l-.37 2.52a7.57 7.57 0 0 0-2.1 1.22l-2.5-1-2 3.46 2.02 1.58a7.63 7.63 0 0 0 0 2.44L2.58 14.8l2 3.46 2.5-1a7.57 7.57 0 0 0 2.1 1.22L9.55 21h4.9l.37-2.52a7.57 7.57 0 0 0 2.1-1.22l2.5 1 2-3.46-2.02-1.58c.07-.4.1-.81.1-1.22Z" />
            </svg>
          </span>
          <span className="min-w-0"><span className="block font-semibold text-gray-900">Notification preferences</span><span className="block truncate text-sm text-gray-500">Choose the alerts you receive and how they arrive</span></span>
        </span>
        <svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5 shrink-0 text-gray-400 transition-transform group-open:rotate-180"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.17l3.71-3.94a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z" clipRule="evenodd" /></svg>
      </summary>

      <div className="border-t border-gray-100 bg-gray-50/50 p-4 sm:p-5">
        {!preferences ? (
          <div className="space-y-3" aria-label="Loading notification preferences"><div className="h-16 animate-pulse rounded-xl bg-gray-200/70" /><div className="h-40 animate-pulse rounded-xl bg-gray-200/70" /></div>
        ) : (
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2">
              {([ ["pushEnabled", "Push notifications", "Alerts sent to this device"], ["inAppEnabled", "In-app notifications", "Alerts stored in your notification centre"] ] as const).map(([key, label, description]) => (
                <label key={key} className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-3.5">
                  <span><span className="block text-sm font-semibold text-gray-800">{label}</span><span className="mt-0.5 block text-xs text-gray-500">{description}</span></span>
                  <input type="checkbox" className="h-4 w-4 shrink-0 accent-[#DFB400]" checked={preferences[key]} onChange={(event) => setPreferences({ ...preferences, [key]: event.target.checked })} />
                </label>
              ))}
            </div>

            <div>
              <div className="mb-2 grid grid-cols-[1fr_48px_48px] gap-2 px-3 text-xs font-semibold uppercase tracking-wide text-gray-500"><span>Alert category</span><span className="text-center">Push</span><span className="text-center">In app</span></div>
              <div className="space-y-2">
                {categories.map((category) => (
                  <div key={category} className="grid grid-cols-[1fr_48px_48px] items-center gap-2 rounded-xl border border-gray-200 bg-white p-3">
                    <span className="min-w-0"><span className="block text-sm font-semibold text-gray-800">{categoryDetails[category].label}</span><span className="block truncate text-xs text-gray-500">{categoryDetails[category].description}</span></span>
                    <input aria-label={`${categoryDetails[category].label} push notifications`} type="checkbox" className="mx-auto h-4 w-4 accent-[#DFB400]" checked={preferences.categories[category].push} disabled={!preferences.pushEnabled} onChange={(event) => updateCategory(category, "push", event.target.checked)} />
                    <input aria-label={`${categoryDetails[category].label} in-app notifications`} type="checkbox" className="mx-auto h-4 w-4 accent-[#DFB400]" checked={preferences.categories[category].inApp} disabled={!preferences.inAppEnabled} onChange={(event) => updateCategory(category, "inApp", event.target.checked)} />
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-4">
              <label className="flex cursor-pointer items-center justify-between gap-4"><span><span className="block text-sm font-semibold text-gray-800">Quiet hours</span><span className="block text-xs text-gray-500">Pause non-critical push alerts during these hours.</span></span><input type="checkbox" className="h-4 w-4 shrink-0 accent-[#DFB400]" checked={preferences.quietHoursEnabled} onChange={(event) => setPreferences({ ...preferences, quietHoursEnabled: event.target.checked })} /></label>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-xs font-medium text-gray-600">Starts<input type="time" value={preferences.quietHoursStart} disabled={!preferences.quietHoursEnabled} onChange={(event) => setPreferences({ ...preferences, quietHoursStart: event.target.value })} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 disabled:bg-gray-100" /></label>
                <label className="text-xs font-medium text-gray-600">Ends<input type="time" value={preferences.quietHoursEnd} disabled={!preferences.quietHoursEnabled} onChange={(event) => setPreferences({ ...preferences, quietHoursEnd: event.target.value })} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 disabled:bg-gray-100" /></label>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs text-gray-500">Critical account and payment alerts may still be delivered.</p><button type="button" disabled={saving} onClick={() => void save()} className="w-full rounded-xl bg-[#141B34] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#27304a] disabled:opacity-50 sm:w-auto">{saving ? "Saving…" : "Save preferences"}</button></div>
          </div>
        )}
      </div>
    </details>
  );
}
