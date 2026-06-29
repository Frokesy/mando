"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowLeftIcon, CopyIcon, MoneyIcon } from "@/components/svgs/DefaultIcons";
import SalesAgentBottomNav from "@/components/SalesAgentBottomNav";
import { useToastStore } from "@/store/toastStore";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

type SalesDashboard = {
  agent: {
    salesAgent: {
      tier: string;
      referralCode: string;
    };
  };
  stats: {
    referralCount: number;
    successfulOrderCount: number;
    totalCommissionAmount: number;
    influencerThreshold: number;
    remainingOrdersToInfluencer: number;
  };
  influencerSignupUrl: string | null;
};

export default function SalesAgentReferral() {
  const router = useRouter();
  const showToast = useToastStore((s) => s.showToast);
  const [dashboard, setDashboard] = useState<SalesDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  const loadReferral = useCallback(async () => {
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/sales-agent/dashboard`, {
        credentials: "include",
      });

      if (response.status === 401 || response.status === 403) {
        router.push("/sales-agent/login");
        return;
      }

      if (!response.ok) throw new Error("Unable to load referral rewards");

      setDashboard((await response.json()) as SalesDashboard);
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Unable to load referral rewards",
        "error",
      );
    } finally {
      setLoading(false);
    }
  }, [router, showToast]);

  useEffect(() => {
    void loadReferral();
  }, [loadReferral]);

  const copyInfluencerLink = async () => {
    if (!dashboard?.influencerSignupUrl) return;

    await navigator.clipboard.writeText(dashboard.influencerSignupUrl);
    showToast("Influencer referral link copied", "success");
  };

  const tier = dashboard?.agent.salesAgent.tier ?? "standard";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="min-h-screen bg-[#F8F8F8] pb-28"
    >
      <div className="p-6">
        <header className="mb-6 flex items-center gap-3">
          <Link href="/sales-agent/dashboard" className="inline-flex items-center gap-3 text-[#4D4D4D]">
            <ArrowLeftIcon />
            <span className="text-lg font-semibold">Referral rewards</span>
          </Link>
        </header>

        <section className="mb-6 rounded-[32px] border border-[#F1D86F] bg-[#FFF7E0] p-6 shadow-[0_20px_60px_rgba(223,180,0,0.12)]">
          <div className="mb-6 flex items-center gap-4">
            <div className="rounded-3xl bg-white p-4">
              <MoneyIcon />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#6B6B6B]">Referral tier</p>
              <h1 className="mt-2 text-2xl font-bold capitalize text-[#141B34]">
                {loading ? "Loading..." : tier}
              </h1>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <RewardStat
              label="Customer referrals"
              value={`${dashboard?.stats.referralCount ?? 0}`}
              change="From attributed customer signups"
            />
            <RewardStat
              label="Successful orders"
              value={`${dashboard?.stats.successfulOrderCount ?? 0}`}
              change={`${dashboard?.stats.remainingOrdersToInfluencer ?? 10} more to influencer`}
            />
            <RewardStat
              label="Commission"
              value={formatCurrency(dashboard?.stats.totalCommissionAmount ?? 0)}
              change="From tracked orders"
            />
          </div>
        </section>

        {dashboard?.influencerSignupUrl ? (
          <section className="mb-6 rounded-[28px] border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="mb-2 text-lg font-semibold text-[#141B34]">
              Influencer link unlocked
            </h2>
            <p className="break-words text-sm font-semibold text-[#141B34]">
              {dashboard.influencerSignupUrl}
            </p>
            <p className="mt-2 text-sm text-[#6B6B6B]">
              Share this with people who want to apply as MANDO sales agents. Admin still approves every new sales agent.
            </p>
            <button
              type="button"
              className="mt-4 inline-flex items-center rounded-2xl bg-[#141B34] px-5 py-3 text-sm font-semibold text-white"
              onClick={() => void copyInfluencerLink()}
            >
              <CopyIcon />
              <span className="ml-2">Copy link</span>
            </button>
          </section>
        ) : (
          <section className="mb-6 rounded-[28px] border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="mb-2 text-lg font-semibold text-[#141B34]">
              Influencer access is locked
            </h2>
            <p className="text-sm text-[#6B6B6B]">
              You need {dashboard?.stats.influencerThreshold ?? 10} successful customer orders before your sales-agent referral link appears.
            </p>
          </section>
        )}

        <section className="mb-6 rounded-[28px] border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-[#141B34]">How sales referrals work</h2>
          <div className="space-y-4">
            <Step
              title="Share combo links"
              text="Every combo share link includes your sales agent ID for customer attribution."
            />
            <Step
              title="Customers sign up and order"
              text="When they create an account from your combo link, their orders count toward your performance."
            />
            <Step
              title="Unlock influencer status"
              text="After 10 successful delivered orders, you qualify to invite downline sales agents."
            />
          </div>
        </section>
      </div>
      <SalesAgentBottomNav />
    </motion.div>
  );
}

function RewardStat({
  label,
  value,
  change,
}: {
  label: string;
  value: string;
  change: string;
}) {
  return (
    <div className="rounded-[24px] bg-white/85 p-4">
      <p className="text-xs text-[#6B6B6B]">{label}</p>
      <p className="mt-2 text-lg font-bold text-[#141B34]">{value}</p>
      <p className="mt-1 text-xs text-[#8A6F00]">{change}</p>
    </div>
  );
}

function Step({ title, text }: { title: string; text: string }) {
  return (
    <div>
      <p className="font-semibold text-[#141B34]">{title}</p>
      <p className="mt-1 text-sm text-[#6B6B6B]">{text}</p>
    </div>
  );
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);
}
