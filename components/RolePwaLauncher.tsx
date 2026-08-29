"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const API_BASE_URL =
  (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000").replace(/\/+$/, "");

const roleDestinations = {
  customer: { dashboard: "/customer/dashboard", login: "/login" },
  sales_agent: { dashboard: "/sales-agent/dashboard", login: "/sales-agent/login" },
  rider: { dashboard: "/rider/dashboard", login: "/rider/login" },
  restaurant: { dashboard: "/restaurant/dashboard", login: "/restaurant/login" },
  admin: { dashboard: "/admin/dashboard/overview", login: "/admin/login" },
} as const;

type PwaRole = keyof typeof roleDestinations;

export function CurrentRolePwaLauncher() {
  const router = useRouter();

  useEffect(() => {
    let active = true;
    void fetch(`${API_BASE_URL}/auth/me`, { credentials: "include", cache: "no-store" })
      .then(async (response) => response.ok ? response.json() as Promise<{ activeRole?: PwaRole }> : null)
      .then((auth) => {
        if (!active) return;
        const destination = auth?.activeRole ? roleDestinations[auth.activeRole] : null;
        router.replace(destination?.dashboard ?? "/login");
      })
      .catch(() => { if (active) router.replace("/login"); });
    return () => { active = false; };
  }, [router]);

  return <LauncherLoading />;
}

export default function RolePwaLauncher({ role }: { role: PwaRole }) {
  const router = useRouter();

  useEffect(() => {
    let active = true;

    async function openRole() {
      const destination = roleDestinations[role];
      try {
        const currentResponse = await fetch(`${API_BASE_URL}/auth/me`, {
          credentials: "include",
          cache: "no-store",
        });
        if (!currentResponse.ok) {
          if (active) router.replace(destination.login);
          return;
        }

        const auth = await currentResponse.json() as { roles?: string[]; activeRole?: string };
        if (!auth.roles?.includes(role)) {
          if (active) router.replace(destination.login);
          return;
        }

        if (auth.activeRole !== role) {
          const selectResponse = await fetch(`${API_BASE_URL}/auth/select-role`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ role }),
          });
          if (!selectResponse.ok) throw new Error("Unable to activate installed role");
        }

        if (active) router.replace(destination.dashboard);
      } catch {
        if (active) router.replace(destination.login);
      }
    }

    void openRole();
    return () => { active = false; };
  }, [role, router]);

  return <LauncherLoading />;
}

function LauncherLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-6 text-center">
      <div>
        <div className="mx-auto h-10 w-10 animate-pulse rounded-2xl bg-[#DFB400]" />
        <p className="mt-4 text-sm font-semibold text-[#141B34]">Opening your Mando dashboard…</p>
      </div>
    </main>
  );
}
