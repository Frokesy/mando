"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV !== "production") {
      // A production PWA may already control localhost from an earlier run.
      // Remove it in development so it cannot serve stale Next.js bundles.
      void navigator.serviceWorker.getRegistrations().then((registrations) =>
        Promise.all(registrations.map((registration) => registration.unregister())),
      );

      if ("caches" in window) {
        void window.caches.keys().then((keys) =>
          Promise.all(
            keys
              .filter((key) => key.startsWith("mando-cache-"))
              .map((key) => window.caches.delete(key)),
          ),
        );
      }

      return;
    }

    const register = () => {
      void navigator.serviceWorker.register("/sw.js").catch((error) => {
        console.warn("Service worker registration failed:", error);
      });
    };

    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });

    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}
