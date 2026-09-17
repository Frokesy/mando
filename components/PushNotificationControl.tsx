"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useToastStore } from "@/store/toastStore";
import { useAuthStore } from "@/store/authStore";

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000").replace(/\/+$/, "");

export const TRUSTED_PUSH_DEVICE_KEY = "mando_push_trusted_device";
const TRUSTED_PUSH_DEVICE_EVENT = "mando:trusted-push-device-change";

type PushNotificationControlProps = {
  onEnabled?: () => void;
  showTrustedOption?: boolean;
};

export default function PushNotificationControl({
  onEnabled,
  showTrustedOption = true,
}: PushNotificationControlProps) {
  const showToast = useToastStore((state) => state.showToast);
  const activeRole = useAuthStore((state) => state.auth?.activeRole);
  const userId = useAuthStore((state) => state.auth?.user.id);
  const supported = useSyncExternalStore(subscribeToBrowserCapabilities, getBrowserPushSupport, getServerPushSupport);
  const trusted = useSyncExternalStore(subscribeToTrustedDevice, getTrustedDeviceSnapshot, getServerTrustedDeviceSnapshot);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");

  useEffect(() => {
    let cancelled = false;
    if (supported) {
      void navigator.serviceWorker.ready
        .then(async (registration) => {
          const subscription = await registration.pushManager.getSubscription();
          const response = await fetch(`${API_BASE_URL}/push/subscriptions`, { credentials: "include", cache: "no-store" });
          if (!response.ok) throw new Error("Unable to check notification registration.");
          const { subscriptions } = await response.json() as { subscriptions: { endpoint: string }[] };
          if (!cancelled) {
            setEnabled(Boolean(subscription && subscriptions.some((saved) => saved.endpoint === subscription.endpoint)));
            setPermission(Notification.permission);
          }
        }).catch(() => { if (!cancelled) setEnabled(false); });
    }
    return () => { cancelled = true; };
  }, [supported, activeRole, userId]);

  if (!supported) return <p className="rounded-xl bg-gray-50 p-3 text-xs leading-5 text-[#6B6B6B]">Push notifications are not available in this browser. On iPhone, add Mando to your Home Screen and open the installed app before enabling push.</p>;

  async function togglePush() {
    setBusy(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      if (existing && enabled) {
        const response = await fetch(`${API_BASE_URL}/push/subscriptions`, {
          method: "DELETE",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: existing.endpoint }),
        });
        if (!response.ok) throw new Error("Unable to disable notifications for this role.");
        const { remainingBindings } = await response.json() as { remainingBindings: number };
        if (remainingBindings === 0) {
          await existing.unsubscribe();
          setTrustedDevice(false);
        }
        setEnabled(false);
        showToast("Push notifications disabled", "success");
        return;
      }

      const permission = await Notification.requestPermission();
      setPermission(permission);
      if (permission !== "granted") throw new Error("Notification permission was not granted.");
      const keyResponse = await fetch(`${API_BASE_URL}/push/public-key`, { credentials: "include" });
      if (!keyResponse.ok) throw new Error("Push notifications are not configured yet.");
      const { publicKey } = (await keyResponse.json()) as { publicKey: string };
      const subscription = existing ?? await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: decodeBase64Url(publicKey),
      });
      const saveResponse = await fetch(`${API_BASE_URL}/push/subscriptions`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });
      if (!saveResponse.ok) {
        if (!existing) await subscription.unsubscribe();
        throw new Error("Unable to save this device for notifications.");
      }
      setEnabled(true);
      const testResponse = await fetch(`${API_BASE_URL}/push/test`, {
        method: "POST",
        credentials: "include",
      });
      if (!testResponse.ok) {
        showToast("Push is enabled, but the welcome notification could not be sent.", "error");
      }
      showToast("Push notifications enabled", "success");
      onEnabled?.();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Unable to update push notifications", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <p className="w-full text-xs leading-5 text-[#6B6B6B]">Enable push separately for each role on this device. Alerts can arrive while Mando is closed; opening another dashboard will not replace this role’s subscription.</p>
      <button type="button" disabled={busy || (permission === "denied" && !enabled)} onClick={() => void togglePush()} className="rounded-xl border border-[#DFB400] px-3 py-2 text-xs font-semibold text-[#9B7D00] disabled:opacity-50">
        {busy ? "Updating…" : permission === "denied" && !enabled ? "Push blocked" : enabled ? "Disable push" : "Enable push"}
      </button>
      {permission === "denied" ? <p className="w-full text-xs leading-5 text-red-600">Notifications are blocked. Enable them in your browser or device settings, then return here.</p> : null}
      {showTrustedOption ? (
        <label className="flex items-center gap-2 text-xs text-[#6B6B6B]">
          <input
            type="checkbox"
            checked={trusted}
            onChange={(event) => {
              const next = event.target.checked;
              setTrustedDevice(next);
            }}
          />
          This is my private device—keep notifications on after logout
        </label>
      ) : null}
    </div>
  );
}

function subscribeToBrowserCapabilities() {
  return () => undefined;
}

function getBrowserPushSupport() {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

function getServerPushSupport() {
  return false;
}

function subscribeToTrustedDevice(onStoreChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === TRUSTED_PUSH_DEVICE_KEY) onStoreChange();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(TRUSTED_PUSH_DEVICE_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(TRUSTED_PUSH_DEVICE_EVENT, onStoreChange);
  };
}

function getTrustedDeviceSnapshot() {
  return window.localStorage.getItem(TRUSTED_PUSH_DEVICE_KEY) === "true";
}

function getServerTrustedDeviceSnapshot() {
  return false;
}

function setTrustedDevice(trusted: boolean) {
  if (trusted) window.localStorage.setItem(TRUSTED_PUSH_DEVICE_KEY, "true");
  else window.localStorage.removeItem(TRUSTED_PUSH_DEVICE_KEY);
  window.dispatchEvent(new Event(TRUSTED_PUSH_DEVICE_EVENT));
}

function decodeBase64Url(value: string) {
  const padding = "=".repeat((4 - value.length % 4) % 4);
  const bytes = atob((value + padding).replace(/-/g, "+").replace(/_/g, "/"));
  const array = Uint8Array.from(bytes, (character) => character.charCodeAt(0));
  return array.buffer.slice(array.byteOffset, array.byteOffset + array.byteLength) as ArrayBuffer;
}
