"use client";

import NotificationSettingsPanel from "@/components/NotificationSettingsPanel";

export default function AdminAccountPage() {
  return (
    <div className="max-w-5xl pb-12 pr-0 sm:pr-8">
      <header className="mb-6">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[#B77900]">Admin account</p>
        <h1 className="mt-1 text-xl font-semibold text-[#101828]">Profile and settings</h1>
        <p className="mt-1 text-xs text-[#667085]">Manage settings associated with your administrator role.</p>
      </header>
      <NotificationSettingsPanel />
    </div>
  );
}
