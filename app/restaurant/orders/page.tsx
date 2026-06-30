"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import RestaurantBottomNav from "@/components/RestaurantBottomNav";
import { ArrowLeftIcon } from "@/components/svgs/DefaultIcons";

const ORDERS = [
  {
    id: "MDO-1029",
    status: "Awaiting decision",
    customer: "Tolu A.",
    total: 5400,
    time: "3 mins ago",
    items: "Jollof Rice + Chicken Combo x2",
  },
  {
    id: "MDO-1028",
    status: "Preparing",
    customer: "Bimpe O.",
    total: 3200,
    time: "18 mins ago",
    items: "Amala + Ewedu Combo x1",
  },
  {
    id: "MDO-1027",
    status: "Ready for pickup",
    customer: "Ife K.",
    total: 2500,
    time: "31 mins ago",
    items: "Fried Rice + Turkey Combo x1",
  },
  {
    id: "MDO-1021",
    status: "Completed",
    customer: "Seyi M.",
    total: 6800,
    time: "Yesterday",
    items: "Party Rice Combo x2",
  },
];

const FILTERS = ["All", "Awaiting decision", "Preparing", "Ready for pickup", "Completed"];

export default function RestaurantOrders() {
  const [activeFilter, setActiveFilter] = useState("All");

  const visibleOrders =
    activeFilter === "All"
      ? ORDERS
      : ORDERS.filter((order) => order.status === activeFilter);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="min-h-screen bg-[#F8F8F8] pb-28"
    >
      <div className="p-6">
        <header className="mb-6 flex items-center gap-3">
          <Link href="/restaurant/dashboard" className="inline-flex items-center gap-3 text-[#4D4D4D]">
            <ArrowLeftIcon />
            <span className="text-lg font-semibold">Orders</span>
          </Link>
        </header>

        <section className="mb-5 overflow-x-auto">
          <div className="flex min-w-max gap-2">
            {FILTERS.map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setActiveFilter(filter)}
                className={`rounded-2xl px-4 py-2 text-sm font-semibold ${
                  activeFilter === filter
                    ? "bg-[#141B34] text-white"
                    : "border border-gray-200 bg-white text-[#6B6B6B]"
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          {visibleOrders.map((order) => (
            <div key={order.id} className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-[#A4A4A4]">{order.time}</p>
                  <h2 className="mt-2 text-lg font-semibold text-[#141B34]">{order.id}</h2>
                  <p className="mt-1 text-sm text-[#6B6B6B]">{order.customer}</p>
                </div>
                <span className="rounded-2xl bg-[#FFF7E0] px-3 py-2 text-xs font-semibold text-[#141B34]">
                  {order.status}
                </span>
              </div>
              <div className="mt-4 rounded-2xl bg-[#F7F7F7] p-4">
                <p className="text-sm font-semibold text-[#141B34]">{order.items}</p>
                <p className="mt-2 text-sm text-[#6B6B6B]">₦{order.total.toLocaleString()}</p>
              </div>
            </div>
          ))}

          {visibleOrders.length === 0 && (
            <div className="rounded-[28px] border border-dashed border-gray-300 bg-white p-6 text-center text-sm font-semibold text-[#6B6B6B]">
              No orders in this category.
            </div>
          )}
        </section>
      </div>

      <RestaurantBottomNav />
    </motion.div>
  );
}
