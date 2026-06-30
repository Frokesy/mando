"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import ConfirmationModal from "@/components/ConfirmationModal";
import RestaurantBottomNav from "@/components/RestaurantBottomNav";
import { ArrowLeftIcon, MoneyIcon, DefaultUserIcon } from "@/components/svgs/DefaultIcons";
import { useToastStore } from "@/store/toastStore";

export default function RestaurantAccount() {
  const showToast = useToastStore((s) => s.showToast);
  const [requestingPayout, setRequestingPayout] = useState(false);
  const [showPayoutConfirmation, setShowPayoutConfirmation] = useState(false);

  const requestPayout = async () => {
    setRequestingPayout(true);
    await new Promise((resolve) => window.setTimeout(resolve, 500));
    setRequestingPayout(false);
    setShowPayoutConfirmation(false);
    showToast("Payout request UI is ready for backend wiring", "success");
  };

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
            <span className="text-lg font-semibold">Restaurant account</span>
          </Link>
        </header>

        <section className="mb-6 rounded-[32px] border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-[#FFF7E0]">
              <DefaultUserIcon />
            </div>
            <div>
              <p className="text-sm text-[#6B6B6B]">Restaurant</p>
              <h1 className="mt-2 text-2xl font-bold text-[#141B34]">Mama Chef Cafe</h1>
              <p className="mt-1 text-sm text-[#A4A4A4]">Fashina, Ile-Ife</p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <InfoBlock label="Status" value="Verified" />
            <InfoBlock label="Unique offer" value="Local African dishes" />
            <InfoBlock label="Payout account" value="Mama Chef Cafe - ****8291" />
            <InfoBlock label="Contact" value="08000000000" />
          </div>
        </section>

        <section className="mb-6 rounded-[28px] border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-[#6B6B6B]">Available payout</p>
              <p className="mt-2 text-3xl font-bold text-[#141B34]">₦42,800</p>
              <p className="mt-2 text-sm text-[#A4A4A4]">Pending admin approval after request.</p>
            </div>
            <div className="rounded-3xl bg-[#FFF7E0] p-3">
              <MoneyIcon />
            </div>
          </div>
          <button
            type="button"
            disabled={requestingPayout}
            className="mt-5 w-full rounded-2xl bg-[#141B34] px-5 py-4 text-sm font-semibold text-white disabled:opacity-60"
            onClick={() => setShowPayoutConfirmation(true)}
          >
            {requestingPayout ? "Requesting..." : "Request payout"}
          </button>
        </section>

        <section className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-semibold text-[#141B34]">Recent payouts</h2>
          <div className="mt-4 space-y-3">
            {[
              { id: "PY-018", date: "26 Jun 2026", amount: "₦31,200", status: "Paid" },
              { id: "PY-017", date: "18 Jun 2026", amount: "₦28,700", status: "Paid" },
            ].map((payout) => (
              <div key={payout.id} className="flex items-center justify-between rounded-3xl bg-[#F7F7F7] p-4">
                <div>
                  <p className="text-sm text-[#6B6B6B]">{payout.date}</p>
                  <p className="mt-1 font-semibold text-[#141B34]">{payout.id}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-[#141B34]">{payout.amount}</p>
                  <p className="mt-1 text-xs text-[#6B6B6B]">{payout.status}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <RestaurantBottomNav />

      <ConfirmationModal
        open={showPayoutConfirmation}
        title="Request payout?"
        description="Admin will review this payout request before it is processed."
        confirmLabel="Request"
        confirming={requestingPayout}
        onClose={() => setShowPayoutConfirmation(false)}
        onConfirm={() => void requestPayout()}
      />
    </motion.div>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl bg-[#F7F4E3] p-4">
      <p className="text-sm text-[#6B6B6B]">{label}</p>
      <p className="mt-3 text-base font-semibold text-[#141B34]">{value}</p>
    </div>
  );
}
