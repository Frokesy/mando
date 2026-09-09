"use client";

import NotificationPreferencesControl from "@/components/NotificationPreferencesControl";
import PushNotificationControl from "@/components/PushNotificationControl";

export default function NotificationSettingsPanel() {
  return (
    <section className="mb-6 space-y-4" aria-labelledby="notification-settings-heading">
      <div>
        <h2 id="notification-settings-heading" className="text-xl font-semibold text-[#141B34]">Notification settings</h2>
        <p className="mt-1 text-sm text-[#6B6B6B]">Manage alerts for this role and device.</p>
      </div>
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-3">
          <h3 className="font-semibold text-[#141B34]">Push notifications</h3>
          <p className="mt-0.5 text-sm text-[#6B6B6B]">Receive important updates even when Mando is closed.</p>
        </div>
        <PushNotificationControl />
      </div>
      <NotificationPreferencesControl />
    </section>
  );
}
