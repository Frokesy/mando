"use client";

import { useEffect, useMemo, useState } from "react";
import {
  FaCog,
  FaDownload,
  FaEye,
  FaFilter,
  FaMoneyBillWave,
  FaReceipt,
  FaSearch,
  FaUndo,
  FaWallet,
} from "react-icons/fa";
import StatsCard from "@/components/cards/StatsCard";

const API_BASE_URL =
  (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000").replace(/\/+$/, "");

type TransactionStatus = "successful" | "processing" | "pending" | "failed" | "refunded";
type Transaction = {
  id: string;
  transactionId: string;
  orderRef: string;
  customer: string;
  restaurant: string;
  rider: string;
  amount: number;
  totalAmount: number;
  type: "payment" | "refund";
  status: TransactionStatus;
  dateTime: string;
  paymentMethod: string;
  paymentSummary: {
    subtotal: number;
    serviceCharge: number;
    deliveryFee: number;
    discount: number;
    total: number;
  };
  parties: {
    customer: string;
    restaurant: string;
    rider: string;
  };
  canRefund: boolean;
  refundRequested: boolean;
};

type FinancialsResponse = {
  stats: {
    totalRevenue: number;
    totalPayouts: number;
    pendingPayouts: number;
    totalRefunds: number;
  };
  serviceCharges: {
    serviceChargeAmount: number;
    deliveryFeeAmount: number;
  };
  transactions: Transaction[];
};

const emptyFinancials: FinancialsResponse = {
  stats: { totalRevenue: 0, totalPayouts: 0, pendingPayouts: 0, totalRefunds: 0 },
  serviceCharges: { serviceChargeAmount: 50, deliveryFeeAmount: 400 },
  transactions: [],
};

export default function AdminFinancialsPage() {
  const [filter, setFilter] = useState("All");
  const [data, setData] = useState<FinancialsResponse>(emptyFinancials);
  const [loading, setLoading] = useState(true);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [showChargesModal, setShowChargesModal] = useState(false);
  const [refundTxnId, setRefundTxnId] = useState<string | null>(null);

  async function loadFinancials() {
    const payload = await fetch(`${API_BASE_URL}/admin/financials`, { credentials: "include" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load financials");
        return response.json() as Promise<FinancialsResponse>;
      });

    setData(payload);
    setSelectedTransaction((current) =>
      current ? payload.transactions.find((transaction) => transaction.id === current.id) ?? payload.transactions[0] ?? null : payload.transactions[0] ?? null,
    );
  }

  useEffect(() => {
    let mounted = true;

    loadFinancials()
      .then((payload) => {
        if (!mounted) return payload;
        return payload;
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const filteredTransactions = useMemo(() => {
    if (filter === "All") return data.transactions;
    return data.transactions.filter(
      (transaction) => transaction.status === filter.toLowerCase() || transaction.type === filter.toLowerCase(),
    );
  }, [data.transactions, filter]);

  const stats = [
    { id: 1, statTitle: "Total Revenue", qty: formatCurrency(data.stats.totalRevenue), crease: "Mando retained", theme: "bg-[#ECFDF5]", increase: true, icon: <FaMoneyBillWave />, iconColor: "text-[#10B981]" },
    { id: 2, statTitle: "Total Payouts", qty: formatCurrency(data.stats.totalPayouts), crease: "Approved/paid", theme: "bg-[#FFFBEB]", increase: true, icon: <FaWallet />, iconColor: "text-[#FE9A00]" },
    { id: 3, statTitle: "Pending Payouts", qty: formatCurrency(data.stats.pendingPayouts), crease: "Awaiting action", theme: "bg-[#EFF6FF]", increase: false, icon: <FaReceipt />, iconColor: "text-[#2B7FFF]" },
    { id: 4, statTitle: "Total Refunds", qty: formatCurrency(data.stats.totalRefunds), crease: "Returned to users", theme: "bg-[#FEF2F2]", increase: false, icon: <FaUndo />, iconColor: "text-[#FF6467]" },
  ];

  async function initiateRefund(transaction: Transaction) {
    setRefundTxnId(transaction.id);
    try {
      const response = await fetch(`${API_BASE_URL}/admin/financials/transactions/${transaction.id}/refund`, {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Unable to initiate refund");
      await loadFinancials();
    } finally {
      setRefundTxnId(null);
    }
  }

  function exportTransactions() {
    const headers = ["Transaction Id", "Customer", "Restaurant", "Rider", "Amount", "Type", "Status", "Date"];
    const rows = filteredTransactions.map((transaction) => [
      transaction.transactionId,
      transaction.customer,
      transaction.restaurant,
      transaction.rider,
      String(transaction.amount),
      transaction.type,
      transaction.status,
      transaction.dateTime,
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `mando-financials-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="pb-10 pr-8">
      <PageHeader
        title="Financials"
        subtitle="Monitor revenue, payouts, refunds and transaction-level payment activity."
        actions={<><Button variant="secondary" icon={<FaDownload />} onClick={exportTransactions}>Export</Button><Button icon={<FaCog />} onClick={() => setShowChargesModal(true)}>Set service charges</Button></>}
      />

      <div className="mt-8 grid grid-cols-4 gap-3">
        {stats.map((item) => <StatsCard key={item.id} {...item} />)}
      </div>

      <section className={`mt-8 grid gap-5 ${selectedTransaction ? "grid-cols-[1fr_380px]" : "grid-cols-1"}`}>
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <SectionTitle title="Transactions" subtitle="Customer payments, refunds, and order-linked settlement status." />
            <div className="flex items-center gap-2">
              <SearchBox />
              <FilterSelect value={filter} onChange={setFilter} />
            </div>
          </div>
          <TableHeader />
          <div className="space-y-1">
            {filteredTransactions.map((transaction) => (
              <button
                key={transaction.id}
                onClick={() => setSelectedTransaction(transaction)}
                className={`grid w-full grid-cols-[1.1fr_1fr_1fr_0.9fr_0.75fr_0.7fr_0.75fr_0.9fr_44px] items-center gap-4 rounded-lg px-2 py-3 text-left text-[10px] text-[#6A7282] hover:bg-[#FFF7E0] ${selectedTransaction?.id === transaction.id ? "bg-[#FFF7E0]" : ""}`}
              >
                <p className="truncate font-semibold text-[#101828]">{transaction.transactionId}</p>
                <p className="truncate">{transaction.customer}</p>
                <p className="truncate">{transaction.restaurant}</p>
                <p className="truncate">{transaction.rider}</p>
                <p>{formatCurrency(transaction.amount)}</p>
                <p className="capitalize">{transaction.type}</p>
                <StatusPill status={transaction.status} />
                <p>{formatDateTime(transaction.dateTime)}</p>
                <FaEye className="text-[#FE9A00]" />
              </button>
            ))}
            {!loading && filteredTransactions.length === 0 ? <p className="py-8 text-center text-[11px] text-[#99A1AF]">No transactions found.</p> : null}
          </div>
        </div>

        {selectedTransaction ? (
          <aside className="sticky top-24 h-fit max-h-[calc(100vh-7rem)] overflow-y-auto rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] text-[#99A1AF]">TXN ID</p>
                <h3 className="mt-1 text-sm font-semibold text-[#101828]">{selectedTransaction.transactionId}</h3>
                <p className="mt-1 text-[10px] text-[#6A7282]">{formatDateTime(selectedTransaction.dateTime)}</p>
              </div>
              <div className="flex items-center gap-2">
                <StatusPill status={selectedTransaction.status} />
                <button onClick={() => setSelectedTransaction(null)} className="rounded-lg border border-gray-200 px-2 py-1 text-[10px] font-semibold text-[#6A7282]">Close</button>
              </div>
            </div>

            <PanelSection title="Transaction Information">
              <DetailRow label="Amount" value={formatCurrency(selectedTransaction.amount)} />
              <DetailRow label="Date & time" value={formatDateTime(selectedTransaction.dateTime)} />
              <DetailRow label="Type" value={selectedTransaction.type} />
              <DetailRow label="Order ref" value={selectedTransaction.orderRef} />
            </PanelSection>

            <PanelSection title="Party Information">
              <DetailRow label="Customer" value={selectedTransaction.parties.customer} />
              <DetailRow label="Restaurant" value={selectedTransaction.parties.restaurant} />
              <DetailRow label="Rider" value={selectedTransaction.parties.rider} />
            </PanelSection>

            <PanelSection title="Payment Summary">
              <DetailRow label="Subtotal" value={formatCurrency(selectedTransaction.paymentSummary.subtotal)} />
              <DetailRow label="Service charge" value={formatCurrency(selectedTransaction.paymentSummary.serviceCharge)} />
              <DetailRow label="Delivery fee" value={formatCurrency(selectedTransaction.paymentSummary.deliveryFee)} />
              <DetailRow label="Discount" value={formatCurrency(selectedTransaction.paymentSummary.discount)} />
            </PanelSection>

            <PanelSection title="Total Amount">
              <div className="rounded-xl bg-[#141B34] p-4 text-white">
                <p className="text-[10px] text-white/70">Customer paid</p>
                <p className="mt-2 text-lg font-semibold">{formatCurrency(selectedTransaction.totalAmount)}</p>
              </div>
            </PanelSection>

            <PanelSection title="Payment Method">
              <DetailRow label="Method" value={selectedTransaction.paymentMethod} />
            </PanelSection>

            <div className="mt-5">
              <Button
                variant={selectedTransaction.canRefund ? "danger" : "secondary"}
                icon={<FaUndo />}
                disabled={!selectedTransaction.canRefund || refundTxnId === selectedTransaction.id}
                onClick={() => initiateRefund(selectedTransaction)}
              >
                {refundTxnId === selectedTransaction.id ? "Initiating..." : selectedTransaction.refundRequested ? "Refund requested" : "Initiate refund"}
              </Button>
            </div>
          </aside>
        ) : null}
      </section>

      {showChargesModal ? (
        <ServiceChargeModal
          serviceChargeAmount={data.serviceCharges.serviceChargeAmount}
          deliveryFeeAmount={data.serviceCharges.deliveryFeeAmount}
          onClose={() => setShowChargesModal(false)}
          onSaved={() => {
            setShowChargesModal(false);
            void loadFinancials();
          }}
        />
      ) : null}
    </div>
  );
}

function PageHeader({ title, subtitle, actions }: { title: string; subtitle: string; actions: React.ReactNode }) {
  return <div className="flex items-start justify-between gap-4"><div><h2 className="text-[18px] font-semibold text-[#101828]">{title}</h2><p className="text-[11px] text-[#99A1AF]">{subtitle}</p></div><div className="flex items-center gap-2">{actions}</div></div>;
}
function SectionTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return <div><h3 className="text-sm font-semibold text-[#101828]">{title}</h3><p className="mt-1 text-[11px] text-[#99A1AF]">{subtitle}</p></div>;
}
function Button({ children, icon, variant = "primary", disabled, onClick, type = "button" }: { children: React.ReactNode; icon?: React.ReactNode; variant?: "primary" | "secondary" | "danger"; disabled?: boolean; onClick?: () => void; type?: "button" | "submit" }) {
  const style = variant === "primary" ? "bg-[#FE9A00] text-white" : variant === "danger" ? "border border-red-200 bg-red-50 text-red-600" : "border border-gray-200 bg-white text-[#6A7282]";
  return <button type={type} disabled={disabled} onClick={onClick} className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-[11px] font-semibold shadow-sm disabled:cursor-not-allowed disabled:opacity-60 ${style}`}>{icon}<span>{children}</span></button>;
}
function SearchBox() {
  return <label className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-[10px] text-[#99A1AF]"><FaSearch /><input className="w-32 outline-none" placeholder="Search txn" /></label>;
}
function FilterSelect({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <label className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-[10px] font-semibold text-[#6A7282]"><FaFilter /><select value={value} onChange={(event) => onChange(event.currentTarget.value)} className="outline-none"><option>All</option><option>successful</option><option>processing</option><option>pending</option><option>failed</option><option>refunded</option><option>payment</option><option>refund</option></select></label>;
}
function TableHeader() {
  const columns = ["Transaction Id", "Customer", "Restaurant", "Rider", "Amount", "Type", "Status", "Date&Time", "Action"];
  return <div className="mt-4 grid grid-cols-[1.1fr_1fr_1fr_0.9fr_0.75fr_0.7fr_0.75fr_0.9fr_44px] gap-4 rounded-lg bg-gray-50 p-3 text-[10px] font-semibold text-[#99A1AF]">{columns.map((column) => <p key={column}>{column}</p>)}</div>;
}
function PanelSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="mt-5"><h4 className="text-xs font-semibold text-[#101828]">{title}</h4><div className="mt-3 space-y-2">{children}</div></section>;
}
function DetailRow({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between gap-4 rounded-lg bg-gray-50 p-3 text-[10px]"><p className="text-[#99A1AF]">{label}</p><p className="max-w-[62%] text-right font-semibold capitalize text-[#101828]">{value}</p></div>;
}
function StatusPill({ status }: { status: TransactionStatus }) {
  const styles = { successful: "bg-[#DCFCE7] text-[#16A34A]", processing: "bg-[#EFF6FF] text-[#1D4ED8]", pending: "bg-[#FFF7E0] text-[#B7791F]", failed: "bg-[#FEF2F2] text-[#DC2626]", refunded: "bg-[#F5F3FF] text-[#7E22CE]" };
  return <p className={`rounded-lg px-2 py-1 text-center text-[10px] font-semibold capitalize ${styles[status]}`}>{status}</p>;
}
function ServiceChargeModal({ serviceChargeAmount, deliveryFeeAmount, onClose, onSaved }: { serviceChargeAmount: number; deliveryFeeAmount: number; onClose: () => void; onSaved: () => void }) {
  const [saving, setSaving] = useState(false);
  async function saveCharges(formData: FormData) {
    setSaving(true);
    try {
      const response = await fetch(`${API_BASE_URL}/admin/financials/service-charges`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          serviceChargeAmount: formData.get("serviceChargeAmount"),
          deliveryFeeAmount: formData.get("deliveryFeeAmount"),
          appliesTo: formData.get("appliesTo"),
          effectiveDate: formData.get("effectiveDate"),
        }),
      });
      if (!response.ok) throw new Error("Unable to save charges");
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 backdrop-blur-sm">
      <form action={saveCharges} className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-[#101828]">Set service charges</h2>
            <p className="mt-1 text-[11px] text-[#6A7282]">Configure customer-facing fees. Admin can later make these location-based.</p>
          </div>
          <button onClick={onClose} className="rounded-lg border border-gray-200 px-3 py-2 text-[10px] font-semibold text-[#6A7282]">Close</button>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-4">
          <FormField name="serviceChargeAmount" label="Service charge" defaultValue={String(serviceChargeAmount)} />
          <FormField name="deliveryFeeAmount" label="Delivery fee" defaultValue={String(deliveryFeeAmount)} />
          <FormField name="appliesTo" label="Applies to" defaultValue="All service areas" />
          <FormField name="effectiveDate" label="Effective date" type="date" />
        </div>
        <div className="mt-6 flex justify-end">
          <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save charges"}</Button>
        </div>
      </form>
    </div>
  );
}
function FormField({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return <label className="block"><span className="text-[10px] font-semibold text-[#6A7282]">{label}</span><input {...props} className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-[11px] outline-none focus:border-[#FE9A00] focus:ring-2 focus:ring-[#FE9A00]/10" /></label>;
}
function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(amount);
}
function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-NG", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}
