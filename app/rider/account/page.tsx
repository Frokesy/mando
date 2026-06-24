"use client";

import { motion } from "framer-motion";
import { ArrowLeftIcon, DefaultUserIcon, MoneyIcon } from "@/components/svgs/DefaultIcons";
import Link from "next/link";
import RiderBottomNav from "@/components/RiderBottomNav";

export default function RiderAccount() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="min-h-screen bg-[#F8F8F8] pb-28"
    >
      <div className="p-6">
        <header className="mb-6 flex items-center gap-3">
          <Link href="/rider/dashboard" className="inline-flex items-center gap-3 text-[#4D4D4D]">
            <ArrowLeftIcon />
            <span className="text-lg font-semibold">Account</span>
          </Link>
        </header>

        <section className="rounded-[32px] bg-white p-6 shadow-sm border border-gray-200 mb-6">
          <div className="flex items-center gap-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#FFF7E0]">
              <DefaultUserIcon />
            </div>
            <div>
              <p className="text-sm text-[#6B6B6B]">Rider</p>
              <h1 className="mt-2 text-2xl font-bold text-[#141B34]">Kola Johnson</h1>
              <p className="mt-1 text-sm text-[#A4A4A4]">kola@courierhub.com</p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-3xl bg-[#F7F4E3] p-4">
              <p className="text-sm text-[#6B6B6B]">Assigned area</p>
              <p className="mt-3 text-base font-semibold text-[#141B34]">Modomo</p>
            </div>
            <div className="rounded-3xl bg-[#F7F4E3] p-4">
              <p className="text-sm text-[#6B6B6B]">Payout method</p>
              <p className="mt-3 text-base font-semibold text-[#141B34]">Bank transfer</p>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button className="rounded-2xl bg-[#141B34] px-5 py-3 text-sm font-semibold text-white">Edit profile</button>
            <button className="rounded-2xl border border-[#141B34] px-5 py-3 text-sm font-semibold text-[#141B34]">Edit payout details</button>
          </div>
        </section>

        <section className="mb-6 rounded-[28px] bg-white p-5 shadow-sm border border-gray-200">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-[#141B34]">Order history</h2>
              <p className="text-sm text-[#6B6B6B]">Your completed deliveries</p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="rounded-3xl bg-[#F7F7F7] p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-[#6B6B6B]">10 Jun 2026</p>
                  <p className="mt-1 font-semibold text-[#141B34]">Bella's</p>
                </div>
                <p className="text-sm font-semibold text-[#141B34]">₦2,100</p>
              </div>
            </div>
            <div className="rounded-3xl bg-[#F7F7F7] p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-[#6B6B6B]">12 Jun 2026</p>
                  <p className="mt-1 font-semibold text-[#141B34]">Gidado's</p>
                </div>
                <p className="text-sm font-semibold text-[#141B34]">₦1,800</p>
              </div>
            </div>
          </div>
        </section>
      </div>
      <RiderBottomNav />
    </motion.div>
  );
}
