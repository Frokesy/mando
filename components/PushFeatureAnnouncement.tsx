"use client";

import { useEffect, useState } from "react";
import PushNotificationControl from "@/components/PushNotificationControl";
import FeatureAnnouncementModal from "@/components/FeatureAnnouncementModal";

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000").replace(/\/+$/, "");

export default function PushFeatureAnnouncement() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function checkEligibility() {
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return;
      const authResponse = await fetch(`${API_BASE_URL}/auth/me`, {
        credentials: "include",
        cache: "no-store",
      });
      if (!authResponse.ok) return;
      const auth = (await authResponse.json()) as { user: { id: string } };
      const announcementKey = `mando_push_announcement_v1:${auth.user.id}`;
      if (window.localStorage.getItem(announcementKey)) return;

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      window.localStorage.setItem(announcementKey, new Date().toISOString());
      if (subscription || Notification.permission === "denied") return;
      if (mounted) setVisible(true);
    }

    void checkEligibility().catch(() => undefined);
    return () => { mounted = false; };
  }, []);

  if (!visible) return null;

  return (
    <FeatureAnnouncementModal
      icon="🔔"
      title="Mando push notifications are here"
      description="Get important order, delivery, payout, and account updates even when Mando is closed."
      onDismiss={() => setVisible(false)}
    >
      <PushNotificationControl onEnabled={() => setVisible(false)} />
    </FeatureAnnouncementModal>
  );
}
