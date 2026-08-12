"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  FinancialsIcon,
  FoodCombosIcon,
  LogoutIcon,
  OperationsIcon,
  OrderIcon,
  OverviewIcon,
  PromoIcon,
  RefreshIcon,
  RiderIcon,
  RolesIcon,
  SalesAgentIcon,
  SupportIcon,
  UserIcon,
  VendorsIcon,
} from "@/components/svgs/AdminIcons";
import { NotificationIcon } from "@/components/svgs/DefaultIcons";
import Link from "next/link";

const API_BASE_URL =
  (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000").replace(/\/+$/, "");
const SESSION_CHECK_INTERVAL_MS = 4 * 60 * 1000;

const AdminDashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function checkSession(initialCheck = false) {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/me`, {
          credentials: "include",
          cache: "no-store",
        });

        if (!mounted) return;

        if (response.status === 401 || response.status === 403) {
          router.replace("/admin/login");
          return;
        }

        if (!response.ok) {
          // A sleeping API or temporary database/network error is not a logout.
          if (initialCheck) setCheckingSession(false);
          return;
        }

        const auth = (await response.json()) as { roles?: string[] };
        if (!auth.roles?.includes("admin")) {
          router.replace("/admin/login");
          return;
        }

        setCheckingSession(false);
      } catch {
        // Keep the current session during transient connectivity failures.
        if (mounted && initialCheck) setCheckingSession(false);
      }
    }

    void checkSession(true);
    const sessionCheckInterval = window.setInterval(
      () => void checkSession(),
      SESSION_CHECK_INTERVAL_MS,
    );

    const checkVisibleSession = () => {
      if (document.visibilityState === "visible") void checkSession();
    };
    document.addEventListener("visibilitychange", checkVisibleSession);

    return () => {
      mounted = false;
      window.clearInterval(sessionCheckInterval);
      document.removeEventListener("visibilitychange", checkVisibleSession);
    };
  }, [router]);

  const menuItems = [
    { id: 1, item: "Overview", icon: <OverviewIcon />, slug: "overview" },
    { id: 2, item: "Orders", icon: <OrderIcon />, slug: "orders" },
    {
      id: 3,
      item: "Vendors/Restaurants",
      icon: <VendorsIcon />,
      slug: "vendors",
    },
    { id: 4, item: "Financials", icon: <FinancialsIcon />, slug: "financials" },
    { id: 5, item: "Promo & Marketing", icon: <PromoIcon />, slug: "promo" },
    {
      id: 6,
      item: "Food Combos",
      icon: <FoodCombosIcon />,
      slug: "food-combos",
    },
    {
      id: 7,
      item: "Sales Agent/Influencer",
      icon: <SalesAgentIcon />,
      slug: "sales",
    },
    { id: 8, item: "Riders", icon: <RiderIcon />, slug: "riders" },
    { id: 9, item: "Operations", icon: <OperationsIcon />, slug: "operations" },
  ];

  const settingsItems = [
    { id: 1, item: "Roles & Permission", icon: <RolesIcon />, slug: "roles" },
    {
      id: 2,
      item: "Notifications",
      icon: <NotificationIcon size={16} />,
      slug: "notifications",
    },
    { id: 3, item: "Payment Logs", icon: <FinancialsIcon />, slug: "payment-logs" },
  ];

  const extrasItems = [
    { id: 1, item: "Account", icon: <UserIcon />, slug: "account" },
    { id: 2, item: "Help & Support", icon: <SupportIcon />, slug: "help" },
    { id: 3, item: "Logout", icon: <LogoutIcon />, slug: "logout" },
  ];

  const isActive = (slug: string) => pathname.toLowerCase().includes(slug);

  const renderItem = (item: {
    id: number;
    item: string;
    icon: React.ReactNode;
    slug: string;
  }) => {
    const active = isActive(item.slug);
    return (
      <Link
        key={item.id}
        href={`/admin/dashboard/${item.slug}`}
        className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
          active
            ? "bg-[#FFB900] text-white"
            : "text-[#4A5565] hover:bg-slate-100"
        }`}
      >
        <div className={active ? "text-white" : "text-[#4A5565]"}>
          {item.icon}
        </div>
        <p className="text-[13px]">{item.item}</p>
      </Link>
    );
  };

  if (checkingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <div className="rounded-2xl bg-white px-6 py-5 text-sm font-semibold text-[#101828] shadow-sm">
          Checking admin session...
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-between pl-8">
      <aside className="sticky top-0 h-screen w-[15%] overflow-y-auto overscroll-contain py-10 pr-4">
        <div className="flex min-h-full flex-col space-y-6 pb-6">
          <p className="text-[14px] font-semibold font-mono">mando</p>

          <div className="flex flex-1 flex-col items-start justify-between space-y-6">
            <div className="flex flex-col space-y-1">
              <h2 className="text-[10px] text-[#404040] uppercase">
                Main Menu
              </h2>
              {menuItems.map(renderItem)}
            </div>

            <div className="flex flex-col space-y-1">
              <h2 className="text-[10px] text-[#404040] uppercase">Settings</h2>
              {settingsItems.map(renderItem)}
            </div>

            <div className="flex flex-col space-y-1">
              {extrasItems.map(renderItem)}
            </div>
          </div>
        </div>
      </aside>
      <main className="w-[85%] flex flex-col">
        {/* Top Nav */}
        <div className="flex justify-between items-center px-8 py-4 border-b border-[#E2E8F0]">
          <div className="flex items-center space-x-2 text-[#808080]">
            <OverviewIcon />
            <h1 className="text-[10px] font-bold">Dashboard</h1>
          </div>

          <div className="flex items-center space-x-4">
            {/* dropdown filter */}
            <div className="border border-[#cccccc] p-2 rounded-md text-[10px] text-[#808080]">
              May 12 - May 18, 2026
            </div>
            <div className="flex items-center space-x-2 border border-[#cccccc] p-2 rounded-md text-[10px] text-[#808080]">
              <RefreshIcon />
              <p>Auto Refresh: 30s</p>
            </div>
            <div className="bg-[#FFB900] w-[28px] h-[28px] text-white flex items-center justify-center rounded-full">
              <NotificationIcon size={16} />
            </div>
            <div className="flex space-x-3">
              <div className="bg-[#FFB900] text-[#ffffff] w-[28px] h-[28px] flex items-center justify-center rounded-full">
                SA
              </div>
              <div className="">
                <h2 className="text-[11px] text-[#101828]">Super Admin</h2>
                <p className="text-[#99A1AF] text-[10px]">Administrator - Brand</p>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-gray-100 pt-8 pl-8 min-h-screen">{children}</div>
      </main>
    </div>
  );
};

export default AdminDashboardLayout;
