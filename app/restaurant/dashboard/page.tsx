"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import ConfirmationModal from "@/components/ConfirmationModal";
import RestaurantBottomNav from "@/components/RestaurantBottomNav";
import { MoneyIcon, TimerIcon } from "@/components/svgs/DefaultIcons";
import { useToastStore } from "@/store/toastStore";

type RestaurantOrder = {
  id: string;
  orderNumber: string;
  customer: string;
  status: "awaiting_restaurant" | "preparing" | "ready_for_pickup";
  total: number;
  placedAt: string;
  address: string;
  combos: { name: string; quantity: number; items: string[] }[];
};

const INITIAL_ORDERS: RestaurantOrder[] = [
  {
    id: "ord-1",
    orderNumber: "MDO-1029",
    customer: "Tolu A.",
    status: "awaiting_restaurant",
    total: 5400,
    placedAt: "3 mins ago",
    address: "Abiron Hostel, Fashina",
    combos: [
      {
        name: "Jollof Rice + Chicken Combo",
        quantity: 2,
        items: ["2 spoons jollof rice", "1 medium chicken", "1 plantain side"],
      },
    ],
  },
  {
    id: "ord-2",
    orderNumber: "MDO-1028",
    customer: "Bimpe O.",
    status: "preparing",
    total: 3200,
    placedAt: "18 mins ago",
    address: "NASFAT Area, Fashina",
    combos: [
      {
        name: "Amala + Ewedu Combo",
        quantity: 1,
        items: ["2 wraps amala", "1 bowl ewedu", "1 beef portion"],
      },
    ],
  },
  {
    id: "ord-3",
    orderNumber: "MDO-1027",
    customer: "Ife K.",
    status: "ready_for_pickup",
    total: 2500,
    placedAt: "31 mins ago",
    address: "Fajuyi Hall, Fashina",
    combos: [
      {
        name: "Fried Rice + Turkey Combo",
        quantity: 1,
        items: ["2 spoons fried rice", "1 turkey piece", "1 coleslaw cup"],
      },
    ],
  },
];

export default function RestaurantDashboard() {
  const router = useRouter();
  const showToast = useToastStore((s) => s.showToast);
  const [orders, setOrders] = useState(INITIAL_ORDERS);
  const [rejectingOrder, setRejectingOrder] = useState<RestaurantOrder | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [showLogoutConfirmation, setShowLogoutConfirmation] = useState(false);

  const awaitingOrders = orders.filter((order) => order.status === "awaiting_restaurant");
  const preparingOrders = orders.filter((order) => order.status === "preparing");
  const readyOrders = orders.filter((order) => order.status === "ready_for_pickup");

  const acceptOrder = (orderId: string) => {
    setOrders((current) =>
      current.map((order) =>
        order.id === orderId ? { ...order, status: "preparing" } : order,
      ),
    );
    showToast("Order accepted and moved to preparation", "success");
  };

  const markReady = (orderId: string) => {
    setOrders((current) =>
      current.map((order) =>
        order.id === orderId ? { ...order, status: "ready_for_pickup" } : order,
      ),
    );
    showToast("Order marked ready for rider pickup", "success");
  };

  const rejectOrder = () => {
    if (!rejectingOrder) return;

    setOrders((current) => current.filter((order) => order.id !== rejectingOrder.id));
    showToast("Order rejected. Admin will be notified when backend is wired.", "success");
    setRejectingOrder(null);
  };

  const logout = async () => {
    setLoggingOut(true);
    await new Promise((resolve) => window.setTimeout(resolve, 350));
    showToast("Logged out successfully", "success");
    router.push("/restaurant/login");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="min-h-screen bg-[#F8F8F8] pb-28"
    >
      <div className="p-6">
        <header className="mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-[#A4A4A4]">Restaurant dashboard</p>
            <h1 className="mt-2 text-2xl font-bold text-[#141B34]">Mama Chef Cafe</h1>
            <p className="mt-1 text-sm text-[#6B6B6B]">Fashina service area</p>
          </div>
          <button
            type="button"
            disabled={loggingOut}
            className="rounded-2xl bg-[#E53E3E] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
            onClick={() => setShowLogoutConfirmation(true)}
          >
            {loggingOut ? "Logging out..." : "Logout"}
          </button>
        </header>

        <section className="mb-6 grid gap-4 sm:grid-cols-2">
          <StatCard label="Awaiting decision" value={`${awaitingOrders.length}`} helper="Accept or reject quickly" icon={<TimerIcon />} />
          <StatCard label="Available payout" value="₦42,800" helper="Last updated today" icon={<MoneyIcon />} />
        </section>

        <OrderSection
          title="Needs your decision"
          subtitle="Rejecting an order will notify admin for follow-up."
          orders={awaitingOrders}
          emptyText="No new orders awaiting decision."
          action={(order) => (
            <div className="mt-4 grid grid-cols-2 gap-3">
              <button
                type="button"
                className="rounded-2xl border border-[#E53E3E] px-4 py-3 text-sm font-semibold text-[#E53E3E]"
                onClick={() => setRejectingOrder(order)}
              >
                Reject
              </button>
              <button
                type="button"
                className="rounded-2xl bg-[#141B34] px-4 py-3 text-sm font-semibold text-white"
                onClick={() => acceptOrder(order.id)}
              >
                Accept
              </button>
            </div>
          )}
        />

        <OrderSection
          title="Preparing now"
          subtitle="Mark ready only when rider can pick it up."
          orders={preparingOrders}
          emptyText="No orders in preparation."
          action={(order) => (
            <button
              type="button"
              className="mt-4 w-full rounded-2xl bg-[#DFB400] px-4 py-3 text-sm font-semibold text-[#141B34]"
              onClick={() => markReady(order.id)}
            >
              Ready for pickup
            </button>
          )}
        />

        <OrderSection
          title="Ready for pickup"
          subtitle="These orders are waiting for rider assignment."
          orders={readyOrders}
          emptyText="No orders ready for pickup."
        />
      </div>

      <RestaurantBottomNav />

      <ConfirmationModal
        open={Boolean(rejectingOrder)}
        title="Reject order?"
        description="Admin will be notified so they can follow up with the customer and restaurant."
        confirmLabel="Reject"
        danger
        onClose={() => setRejectingOrder(null)}
        onConfirm={rejectOrder}
      />

      <ConfirmationModal
        open={showLogoutConfirmation}
        title="Log out?"
        description="You will need to log in again before managing restaurant orders."
        confirmLabel="Logout"
        confirming={loggingOut}
        danger
        onClose={() => setShowLogoutConfirmation(false)}
        onConfirm={() => {
          setShowLogoutConfirmation(false);
          void logout();
        }}
      />
    </motion.div>
  );
}

function StatCard({
  label,
  value,
  helper,
  icon,
}: {
  label: string;
  value: string;
  helper: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-[#6B6B6B]">{label}</p>
          <p className="mt-3 text-3xl font-bold text-[#141B34]">{value}</p>
        </div>
        <div className="rounded-3xl bg-[#FFF7E0] p-3">{icon}</div>
      </div>
      <p className="mt-4 text-sm text-[#A4A4A4]">{helper}</p>
    </div>
  );
}

function OrderSection({
  title,
  subtitle,
  orders,
  emptyText,
  action,
}: {
  title: string;
  subtitle: string;
  orders: RestaurantOrder[];
  emptyText: string;
  action?: (order: RestaurantOrder) => React.ReactNode;
}) {
  return (
    <section className="mb-6">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-[#141B34]">{title}</h2>
        <p className="text-sm text-[#6B6B6B]">{subtitle}</p>
      </div>
      <div className="space-y-4">
        {orders.length === 0 ? (
          <div className="rounded-[28px] border border-dashed border-gray-300 bg-white p-6 text-center text-sm font-semibold text-[#6B6B6B]">
            {emptyText}
          </div>
        ) : (
          orders.map((order) => (
            <div key={order.id} className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-[#A4A4A4]">{order.placedAt}</p>
                  <h3 className="mt-2 text-lg font-semibold text-[#141B34]">{order.orderNumber}</h3>
                  <p className="mt-1 text-sm text-[#6B6B6B]">{order.customer} - {order.address}</p>
                </div>
                <p className="text-sm font-semibold text-[#141B34]">₦{order.total.toLocaleString()}</p>
              </div>
              <div className="mt-4 space-y-3">
                {order.combos.map((combo) => (
                  <div key={combo.name} className="rounded-2xl bg-[#F7F7F7] p-4">
                    <p className="font-semibold text-[#141B34]">{combo.name} x{combo.quantity}</p>
                    <div className="mt-2 space-y-1">
                      {combo.items.map((item) => (
                        <p key={item} className="text-sm text-[#6B6B6B]">{item}</p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              {action?.(order)}
            </div>
          ))
        )}
      </div>
    </section>
  );
}
