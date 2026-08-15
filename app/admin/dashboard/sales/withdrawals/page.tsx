"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FaArrowLeft, FaCheck, FaTimes } from "react-icons/fa";
import { TablePagination, useTablePagination } from "@/components/admin/TablePagination";
import { useToastStore } from "@/store/toastStore";

const API_BASE_URL =
  (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000").replace(/\/+$/, "");

type Withdrawal = {
  id: string;
  agentId: string | null;
  agent: string;
  agentCode: string;
  tier: string;
  amount: number;
  status: string;
  requestDate: string;
  reviewedAt: string | null;
  bankName: string;
  accountName: string;
  accountNumber: string;
};

type ResponseBody = {
  stats: {
    totalRequests: number;
    pendingRequests: number;
    pendingAmount: number;
    approvedAmount: number;
  };
  withdrawals: Withdrawal[];
};

const emptyData: ResponseBody = {
  stats: { totalRequests: 0, pendingRequests: 0, pendingAmount: 0, approvedAmount: 0 },
  withdrawals: [],
};

const filters = ["all", "pending", "approved", "rejected"] as const;

export default function SalesAgentWithdrawalsPage() {
  const showToast = useToastStore((state) => state.showToast);
  const [data, setData] = useState<ResponseBody>(emptyData);
  const [filter, setFilter] = useState<(typeof filters)[number]>("all");
  const [selected, setSelected] = useState<Withdrawal | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const loadWithdrawals = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/admin/sales/withdrawals`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Unable to load sales-agent withdrawals");
      const payload = (await response.json()) as ResponseBody;
      setData(payload);
      setSelected((current) =>
        current ? payload.withdrawals.find((item) => item.id === current.id) ?? null : null,
      );
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Unable to load withdrawals", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void Promise.resolve().then(loadWithdrawals);
  }, [loadWithdrawals]);

  const filtered = useMemo(() => {
    if (filter === "all") return data.withdrawals;
    if (filter === "pending") {
      return data.withdrawals.filter((item) => ["pending", "under_review"].includes(item.status));
    }
    return data.withdrawals.filter((item) => item.status === filter);
  }, [data.withdrawals, filter]);
  const pagination = useTablePagination(filtered);

  async function review(status: "approved" | "rejected") {
    if (!selected) return;
    setUpdating(true);
    try {
      const response = await fetch(`${API_BASE_URL}/admin/sales/withdrawals/${selected.id}/status`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const body = (await response.json().catch(() => null)) as { message?: string } | null;
      if (!response.ok) throw new Error(body?.message ?? "Unable to review withdrawal");
      showToast(`Withdrawal ${status}`, "success");
      setSelected(null);
      await loadWithdrawals();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Unable to review withdrawal", "error");
    } finally {
      setUpdating(false);
    }
  }

  return (
    <div className="pb-10 pr-8">
      <div className="flex items-center gap-3">
        <Link href="/admin/dashboard/sales" className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-[#6A7282]"><FaArrowLeft /></Link>
        <div><h1 className="text-[18px] font-semibold text-[#101828]">Sales-agent withdrawals</h1><p className="text-[11px] text-[#99A1AF]">Review requests and manually pay approved agents.</p></div>
      </div>

      <div className="mt-8 grid grid-cols-4 gap-3">
        <Summary label="All requests" value={String(data.stats.totalRequests)} />
        <Summary label="Pending requests" value={String(data.stats.pendingRequests)} />
        <Summary label="Pending amount" value={formatCurrency(data.stats.pendingAmount)} />
        <Summary label="Approved amount" value={formatCurrency(data.stats.approvedAmount)} />
      </div>

      <section className={`mt-8 grid gap-5 ${selected ? "grid-cols-[1fr_360px]" : "grid-cols-1"}`}>
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div><h2 className="text-sm font-semibold text-[#101828]">Withdrawal requests</h2><p className="mt-1 text-[11px] text-[#99A1AF]">Bank details are shown only to authenticated admins.</p></div>
            <div className="flex rounded-lg bg-gray-100 p-1">{filters.map((item) => <button key={item} onClick={() => setFilter(item)} className={`rounded-md px-3 py-1.5 text-[10px] font-semibold capitalize ${filter === item ? "bg-white shadow-sm" : "text-[#6A7282]"}`}>{item}</button>)}</div>
          </div>
          <div className="mt-4 grid grid-cols-[1.3fr_0.8fr_0.8fr_1fr_0.9fr_0.8fr] gap-4 rounded-lg bg-gray-50 p-3 text-[10px] font-semibold text-[#99A1AF]"><p>Agent</p><p>Code</p><p>Amount</p><p>Bank</p><p>Requested</p><p>Status</p></div>
          <div className="space-y-1">
            {loading ? <p className="py-8 text-center text-[11px] text-[#99A1AF]">Loading withdrawals...</p> : null}
            {!loading && pagination.pageItems.map((item) => <button key={item.id} onClick={() => setSelected(item)} className={`grid w-full grid-cols-[1.3fr_0.8fr_0.8fr_1fr_0.9fr_0.8fr] items-center gap-4 rounded-lg px-2 py-3 text-left text-[10px] text-[#6A7282] hover:bg-[#FFF7E0] ${selected?.id === item.id ? "bg-[#FFF7E0]" : ""}`}><p className="font-semibold text-[#101828]">{item.agent}</p><p>{item.agentCode}</p><p>{formatCurrency(item.amount)}</p><p>{item.bankName}</p><p>{formatDate(item.requestDate)}</p><Status status={item.status} /></button>)}
            {!loading && filtered.length === 0 ? <p className="py-8 text-center text-[11px] text-[#99A1AF]">No withdrawal requests found.</p> : null}
          </div>
          <TablePagination {...pagination} onPageChange={pagination.setPage} />
        </div>

        {selected ? <aside className="sticky top-24 h-fit rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"><div className="flex items-start justify-between"><div><p className="text-[10px] text-[#99A1AF]">Payout details</p><h2 className="mt-1 text-sm font-semibold">{selected.agent}</h2></div><button onClick={() => setSelected(null)} className="rounded-lg border px-2 py-1 text-[10px]">Close</button></div><div className="mt-5 space-y-3"><Detail label="Request ID" value={selected.id} /><Detail label="Agent code" value={selected.agentCode} /><Detail label="Tier" value={selected.tier} /><Detail label="Amount" value={formatCurrency(selected.amount)} /><Detail label="Bank" value={selected.bankName} /><Detail label="Account name" value={selected.accountName} /><Detail label="Account number" value={selected.accountNumber} /><Detail label="Requested" value={formatDate(selected.requestDate)} /><Detail label="Status" value={selected.status.replaceAll("_", " ")} /></div>{["pending", "under_review"].includes(selected.status) ? <div className="mt-5 grid grid-cols-2 gap-3"><button disabled={updating} onClick={() => void review("approved")} className="flex items-center justify-center gap-2 rounded-lg bg-green-600 px-3 py-2 text-[11px] font-semibold text-white disabled:opacity-50"><FaCheck />Approve</button><button disabled={updating} onClick={() => void review("rejected")} className="flex items-center justify-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-[11px] font-semibold text-red-600 disabled:opacity-50"><FaTimes />Reject</button></div> : null}</aside> : null}
      </section>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) { return <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"><p className="text-[11px] text-[#99A1AF]">{label}</p><p className="mt-2 text-xl font-semibold text-[#101828]">{value}</p></div>; }
function Detail({ label, value }: { label: string; value: string }) { return <div className="flex items-start justify-between gap-4 text-[11px]"><span className="text-[#99A1AF]">{label}</span><span className="break-all text-right font-semibold text-[#101828]">{value}</span></div>; }
function Status({ status }: { status: string }) { const color = status === "approved" ? "bg-green-50 text-green-700" : status === "rejected" ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-700"; return <span className={`w-fit rounded-full px-2 py-1 font-semibold capitalize ${color}`}>{status.replaceAll("_", " ")}</span>; }
function formatCurrency(value: number) { return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(value); }
function formatDate(value: string) { return new Intl.DateTimeFormat("en-NG", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value)); }
