"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AiFillHome, AiOutlineHome } from "react-icons/ai";
import { FiBell, FiClipboard, FiUser } from "react-icons/fi";
import useUnreadNotificationCount from "@/hooks/useUnreadNotificationCount";

const RestaurantBottomNav = () => {
  const pathname = usePathname();
  const unreadCount = useUnreadNotificationCount();

  const tabs = [
    {
      href: "/restaurant/notifications",
      label: "Alerts",
      icon: FiBell,
      activeIcon: FiBell,
      match: "/restaurant/notifications",
    },
    {
      href: "/restaurant/dashboard",
      label: "Dashboard",
      icon: AiOutlineHome,
      activeIcon: AiFillHome,
      match: "/restaurant/dashboard",
    },
    {
      href: "/restaurant/orders",
      label: "Orders",
      icon: FiClipboard,
      activeIcon: FiClipboard,
      match: "/restaurant/orders",
    },
    {
      href: "/restaurant/account",
      label: "Account",
      icon: FiUser,
      activeIcon: FiUser,
      match: "/restaurant/account",
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white/95 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-4xl justify-around px-4 py-3">
        {tabs.map((tab) => {
          const isActive = pathname?.startsWith(tab.match);
          const Icon = isActive ? tab.activeIcon : tab.icon;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`relative flex flex-col items-center gap-1 rounded-3xl px-4 py-2 transition-all duration-200 ${
                isActive ? "bg-[#FFF7E0] text-[#DFB400]" : "text-[#6B6B6B] hover:text-[#000]"
              }`}
            >
              <div className="relative"><Icon size={24} />{tab.label === "Alerts" && unreadCount > 0 ? <span className="absolute -right-2.5 -top-2 inline-flex h-5 min-w-[18px] items-center justify-center rounded-full bg-red-600 px-1 text-[9px] font-bold text-white ring-2 ring-white">{unreadCount > 99 ? "99+" : unreadCount}</span> : null}</div>
              <span className="text-[11px] font-medium">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default RestaurantBottomNav;
