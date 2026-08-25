"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useToastStore } from "@/store/toastStore";

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
  const supported = useSyncExternalStore(subscribeToBrowserCapabilities, getBrowserPushSupport, getServerPushSupport);
  const trusted = useSyncExternalStore(subscribeToTrustedDevice, getTrustedDeviceSnapshot, getServerTrustedDeviceSnapshot);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (supported) {
      void navigator.serviceWorker.ready
        .then((registration) => registration.pushManager.getSubscription())
        .then((subscription) => setEnabled(Boolean(subscription)));
    }
  }, [supported]);

  if (!supported) return null;

  async function togglePush() {
    setBusy(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      if (existing) {
        await fetch(`${API_BASE_URL}/push/subscriptions`, {
          method: "DELETE",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: existing.endpoint }),
        });
        await existing.unsubscribe();
        setTrustedDevice(false);
        setEnabled(false);
        showToast("Push notifications disabled", "success");
        return;
      }

      const permission = await Notification.requestPermission();
      if (permission !== "granted") throw new Error("Notification permission was not granted.");
      const keyResponse = await fetch(`${API_BASE_URL}/push/public-key`, { credentials: "include" });
      if (!keyResponse.ok) throw new Error("Push notifications are not configured yet.");
      const { publicKey } = (await keyResponse.json()) as { publicKey: string };
      const subscription = await registration.pushManager.subscribe({
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
        await subscription.unsubscribe();
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
      <button type="button" disabled={busy} onClick={() => void togglePush()} className="rounded-xl border border-[#DFB400] px-3 py-2 text-xs font-semibold text-[#9B7D00] disabled:opacity-50">
        {busy ? "Updating…" : enabled ? "Disable push" : "Enable push"}
      </button>
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
