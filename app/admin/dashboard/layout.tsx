"use client";

import { usePathname } from "next/navigation";
import {
  AuditLogIcon,
  FinancialsIcon,
  FoodCombosIcon,
  LogoutIcon,
  OperationsIcon,
  OrderIcon,
  OverviewIcon,
  PromoIcon,
  RolesIcon,
  SalesAgentIcon,
  SupportIcon,
  UserIcon,
  VendorsIcon,
} from "@/components/svgs/AdminIcons";
import { NotificationIcon } from "@/components/svgs/DefaultIcons";
import Link from "next/link";

const AdminDashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname() ?? "";

  const menuItems = [
    { id: 1, item: "Overview", icon: <OverviewIcon />, slug: "overview" },
    { id: 2, item: "Orders", icon: <OrderIcon />, slug: "orders" },
    { id: 3, item: "Vendors/Restaurants", icon: <VendorsIcon />, slug: "vendors" },
    { id: 4, item: "Financials", icon: <FinancialsIcon />, slug: "financials" },
    { id: 5, item: "Promo & Marketing", icon: <PromoIcon />, slug: "promo" },
    { id: 6, item: "Food Combos", icon: <FoodCombosIcon />, slug: "food-combos" },
    { id: 7, item: "Sales Agent/Influencer", icon: <SalesAgentIcon />, slug: "sales" },
    { id: 8, item: "Operations", icon: <OperationsIcon />, slug: "operations" },
  ];

  const settingsItems = [
    { id: 1, item: "Roles & Permission", icon: <RolesIcon />, slug: "roles" },
    { id: 2, item: "Notifications", icon: <NotificationIcon size={16} />, slug: "notifications" },
    { id: 3, item: "Audit Log", icon: <AuditLogIcon />, slug: "audit" },
  ];

  const extrasItems = [
    { id: 1, item: "Account", icon: <UserIcon />, slug: "account" },
    { id: 2, item: "Help & Support", icon: <SupportIcon />, slug: "help" },
    { id: 3, item: "Logout", icon: <LogoutIcon />, slug: "logout" },
  ];

  const isActive = (slug: string) => pathname.toLowerCase().includes(slug);

  const renderItem = (item: { id: number; item: string; icon: React.ReactNode; slug: string }) => {
    const active = isActive(item.slug);
    return (
      <Link
        key={item.id}
        href={`/admin/dashboard/${item.slug}`}
        className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
          active ? "bg-[#FFB900] text-white" : "text-[#4A5565] hover:bg-slate-100"
        }`}
      >
        <div className={active ? "text-white" : "text-[#4A5565]"}>{item.icon}</div>
        <p className="text-[13px]">{item.item}</p>
      </Link>
    );
  };

  return (
    <div className="flex justify-between sticky top-0 h-[100vh] px-8 py-10 overflow-y-hidden">
      <aside className="w-[15%] items-start pr-4">
        <div className="space-y-6">
          <p className="text-[14px] font-semibold font-mono">mando</p>

          <div className="flex flex-col justify-between items-start space-y-6 h-full">
            <div className="flex flex-col space-y-1">
              <h2 className="text-[10px] text-[#404040] uppercase">Main Menu</h2>
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
      <main className="w-[80%]">{children}</main>
    </div>
  );
};

export default AdminDashboardLayout;
