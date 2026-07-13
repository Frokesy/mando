"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { FaArrowLeft, FaCheck, FaTimes } from "react-icons/fa";
import { useToastStore } from "@/store/toastStore";

const API_BASE_URL =
  (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000").replace(/\/+$/, "");

type VehicleFeeSetting = {
  id: "motorcycle" | "bicycle" | "car";
  vehicleType: string;
  deliveryFee: number;
  mandoCutPercent: number;
};

type PayoutSettings = {
  frequency: string;
  payoutTime: string;
  minimumWithdrawal: number;
  autoProcess: boolean;
  autoDeductCommission: boolean;
};

type RiderWithdrawal = {
  id: string;
  rider: string;
  deliveries: number;
  deliveryFees: number;
  mandoCut: number;
  riderAmount: number;
  paymentMethod: string;
  payoutDetails: string;
  requestDate: string;
  status: "pending" | "approved" | "rejected";
};

type RiderCommissionsResponse = {
  vehicleFeeSettings: VehicleFeeSetting[];
  payoutSettings: PayoutSettings;
  withdrawalRequests: RiderWithdrawal[];
};

const emptyData: RiderCommissionsResponse = {
  vehicleFeeSettings: [],
  payoutSettings: {
    frequency: "Weekly",
    payoutTime: "17:00",
    minimumWithdrawal: 5000,
    autoProcess: false,
    autoDeductCommission: true,
  },
  withdrawalRequests: [],
};

const requestFilters = ["all", "pending", "approved", "rejected"] as const;

export default function RiderCommissionsPage() {
  const showToast = useToastStore((s) => s.showToast);
  const [data, setData] = useState<RiderCommissionsResponse>(emptyData);
  const [filter, setFilter] = useState<(typeof requestFilters)[number]>("all");
  const [autoDeduct, setAutoDeduct] = useState(true);
  const [autoProcess, setAutoProcess] = useState(false);
  const [payoutFrequency, setPayoutFrequency] = useState("Weekly");
  const [payoutTime, setPayoutTime] = useState("17:00");
  const [minimumWithdrawal, setMinimumWithdrawal] = useState("5000");
  const [vehicleFeeSettings, setVehicleFeeSettings] = useState<VehicleFeeSetting[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<RiderWithdrawal | null>(null);
  const [updatingRequestId, setUpdatingRequestId] = useState<string | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [loading, setLoading] = useState(true);

  async function loadCommissions() {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/admin/riders/commissions`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Unable to load rider commissions");

      const payload = (await response.json()) as RiderCommissionsResponse;
      setData(payload);
      setAutoDeduct(payload.payoutSettings.autoDeductCommission);
      setAutoProcess(payload.payoutSettings.autoProcess);
      setPayoutFrequency(payload.payoutSettings.frequency);
      setPayoutTime(payload.payoutSettings.payoutTime);
      setMinimumWithdrawal(String(payload.payoutSettings.minimumWithdrawal));
      setVehicleFeeSettings(payload.vehicleFeeSettings);
      setSelectedRequest((current) => current ? payload.withdrawalRequests.find((request) => request.id === current.id) ?? null : null);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Unable to load rider commissions", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadCommissions();
  }, []);

  const filteredRequests = useMemo(() => {
    if (filter === "all") return data.withdrawalRequests;
    return data.withdrawalRequests.filter((request) => request.status === filter);
  }, [data.withdrawalRequests, filter]);

  async function saveSettings() {
    setSavingSettings(true);
    try {
      const response = await fetch(`${API_BASE_URL}/admin/riders/commissions/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          frequency: payoutFrequency,
          payoutTime,
          minimumWithdrawal: Number(minimumWithdrawal),
          autoProcess,
          autoDeductCommission: autoDeduct,
          vehicleFeeSettings,
        }),
      });
      if (!response.ok) throw new Error("Unable to save rider payout settings");

      await loadCommissions();
      showToast("Rider payout settings saved", "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Unable to save rider payout settings", "error");
    } finally {
      setSavingSettings(false);
    }
  }

  function updateVehicleFeeSetting(
    id: VehicleFeeSetting["id"],
    patch: Partial<Pick<VehicleFeeSetting, "deliveryFee" | "mandoCutPercent">>,
  ) {
    setVehicleFeeSettings((current) =>
      current.map((setting) => setting.id === id ? { ...setting, ...patch } : setting),
    );
  }

  async function updateWithdrawal(status: "approved" | "rejected") {
    if (!selectedRequest) return;
    setUpdatingRequestId(selectedRequest.id);
    try {
      const response = await fetch(`${API_BASE_URL}/admin/riders/withdrawals/${selectedRequest.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error("Unable to update rider withdrawal");

      showToast(status === "approved" ? "Rider withdrawal approved" : "Rider withdrawal rejected", "success");
      setSelectedRequest(null);
      await loadCommissions();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Unable to update rider withdrawal", "error");
    } finally {
      setUpdatingRequestId(null);
    }
  }

  return (
    <div className="pb-10 pr-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <Link href="/admin/dashboard/riders" className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-[#6A7282]">
              <FaArrowLeft className="text-[12px]" />
            </Link>
            <h2 className="text-[18px] font-semibold text-[#101828]">Rider Commissions & Withdrawals</h2>
          </div>
          <p className="mt-2 text-[11px] text-[#99A1AF]">Control rider delivery fee sharing and review rider payout requests.</p>
        </div>
      </div>

      <section className="mt-8 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-[#101828]">Delivery Fee Settings</h3>
        <p className="mt-1 text-[11px] text-[#99A1AF]">Set how delivery fees are split between Mando and riders before payout.</p>

        <div className="mt-5 flex gap-5">
          <div className="w-[32%] space-y-4">
            <div className="rounded-2xl border border-amber-100 bg-[#FFFBEB] p-4">
              <h4 className="text-xs font-semibold text-[#101828]">How it works</h4>
              <div className="mt-4 space-y-3 text-[11px]">
                <ExampleRow label="Customer pays delivery" value="NGN 400" />
                <ExampleRow label="Mando keeps 20%" value="NGN 80" />
                <ExampleRow label="Rider gets 80%" value="NGN 320" strong />
              </div>
            </div>
            <ToggleRow label="Auto deduct Mando cut" checked={autoDeduct} onToggle={() => setAutoDeduct((value) => !value)} />
          </div>

          <div className="grid flex-1 grid-cols-2 gap-5">
            <div className="rounded-2xl border border-gray-100 p-4">
              <h4 className="text-xs font-semibold text-[#101828]">Delivery Fee & Commission by Vehicle</h4>
              <div className="mt-4 space-y-3">
                {loading ? <SkeletonRows count={3} /> : null}
                {!loading && vehicleFeeSettings.map((setting) => (
                  <div key={setting.id} className="grid grid-cols-[1fr_88px_80px] items-center gap-3 rounded-lg bg-gray-50 p-3">
                    <div>
                      <p className="text-[11px] font-semibold text-[#101828]">{setting.vehicleType}</p>
                      <p className="mt-1 text-[10px] text-[#99A1AF]">Fee and Mando cut</p>
                    </div>
                    <input
                      type="number"
                      value={setting.deliveryFee}
                      onChange={(event) => updateVehicleFeeSetting(setting.id, { deliveryFee: Number(event.currentTarget.value) })}
                      aria-label={`${setting.vehicleType} delivery fee`}
                      className="w-full rounded-lg border border-gray-200 px-2 py-2 text-right text-[11px]"
                    />
                    <div className="relative">
                      <input
                        type="number"
                        value={setting.mandoCutPercent}
                        onChange={(event) => updateVehicleFeeSetting(setting.id, { mandoCutPercent: Number(event.currentTarget.value) })}
                        aria-label={`${setting.vehicleType} Mando cut`}
                        className="w-full rounded-lg border border-gray-200 px-2 py-2 pr-5 text-right text-[11px]"
                      />
                      <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[#99A1AF]">%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-gray-100 p-4">
              <h4 className="text-xs font-semibold text-[#101828]">Payout Settings</h4>
              <div className="mt-4 space-y-3">
                <SelectField label="Payout frequency" value={payoutFrequency} onChange={setPayoutFrequency} options={["Daily", "Weekly", "Bi-weekly", "Monthly"]} />
                <FormField label="Payout time" type="time" value={payoutTime} onChange={(event) => setPayoutTime(event.currentTarget.value)} />
                <FormField label="Minimum withdrawal" type="number" value={minimumWithdrawal} onChange={(event) => setMinimumWithdrawal(event.currentTarget.value)} />
                <ToggleRow label="Auto process payout" checked={autoProcess} onToggle={() => setAutoProcess((value) => !value)} />
              </div>
              <div className="mt-5 flex justify-end">
                <button disabled={savingSettings} onClick={saveSettings} className="rounded-lg bg-[#FE9A00] px-4 py-2 text-[11px] font-semibold text-white disabled:opacity-60">
                  {savingSettings ? "Saving..." : "Save settings"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={`mt-8 grid gap-5 ${selectedRequest ? "grid-cols-[1fr_360px]" : "grid-cols-1"}`}>
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold text-[#101828]">Rider Withdrawal Requests</h3>
              <p className="mt-1 text-[11px] text-[#99A1AF]">Review pending and historical rider payout requests.</p>
            </div>
            <div className="flex rounded-lg bg-gray-100 p-1">
              {requestFilters.map((item) => (
                <button key={item} onClick={() => setFilter(item)} className={`rounded-md px-3 py-1.5 text-[10px] font-semibold capitalize ${filter === item ? "bg-white text-[#101828] shadow-sm" : "text-[#6A7282]"}`}>
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-[1.4fr_0.7fr_0.9fr_0.9fr_0.9fr_1fr_0.9fr_0.8fr] gap-4 rounded-lg bg-gray-50 p-3 text-[10px] font-semibold text-[#99A1AF]">
            <p>Rider</p>
            <p>Deliveries</p>
            <p>Delivery Fees</p>
            <p>Mando Cut</p>
            <p>Rider Amount</p>
            <p>Payment Method</p>
            <p>Request Date</p>
            <p>Status</p>
          </div>

          <div className="space-y-1">
            {loading ? <SkeletonRows count={4} /> : null}
            {!loading && filteredRequests.length === 0 ? <p className="py-8 text-center text-[11px] text-[#99A1AF]">No withdrawal requests found.</p> : null}
            {!loading && filteredRequests.map((request) => (
              <button key={request.id} onClick={() => setSelectedRequest(request)} className={`grid w-full grid-cols-[1.4fr_0.7fr_0.9fr_0.9fr_0.9fr_1fr_0.9fr_0.8fr] items-center gap-4 px-2 py-3 text-left text-[10px] text-[#6A7282] hover:bg-[#FFF7E0] ${selectedRequest?.id === request.id ? "bg-[#FFF7E0]" : ""}`}>
                <p className="font-semibold text-[#101828]">{request.rider}</p>
                <p>{request.deliveries}</p>
                <p>{formatCurrency(request.deliveryFees)}</p>
                <p>{formatCurrency(request.mandoCut)}</p>
                <p>{formatCurrency(request.riderAmount)}</p>
                <p>{request.paymentMethod}</p>
                <p>{formatDate(request.requestDate)}</p>
                <StatusPill status={request.status} />
              </button>
            ))}
          </div>
        </div>

        {selectedRequest ? (
          <aside className="sticky top-24 h-fit rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] text-[#99A1AF]">Payout details</p>
                <h3 className="mt-1 text-sm font-semibold text-[#101828]">{selectedRequest.rider}</h3>
              </div>
              <button onClick={() => setSelectedRequest(null)} className="rounded-md border border-gray-200 px-2 py-1 text-[10px] font-semibold text-[#6A7282]">Close</button>
            </div>

            <PanelSection title="Request Info">
              <DetailRow label="Request ID" value={selectedRequest.id} />
              <DetailRow label="Deliveries" value={String(selectedRequest.deliveries)} />
              <DetailRow label="Request date" value={formatDate(selectedRequest.requestDate)} />
              <DetailRow label="Payout method" value={selectedRequest.paymentMethod} />
              <DetailRow label="Payout details" value={selectedRequest.payoutDetails} />
              <DetailRow label="Status" value={selectedRequest.status} />
            </PanelSection>

            <PanelSection title="Payout Breakdown">
              <DetailRow label="Delivery fees" value={formatCurrency(selectedRequest.deliveryFees)} />
              <DetailRow label="Mando's cut" value={formatCurrency(selectedRequest.mandoCut)} />
              <DetailRow label="Rider gets" value={formatCurrency(selectedRequest.riderAmount)} />
            </PanelSection>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button onClick={() => updateWithdrawal("approved")} disabled={updatingRequestId === selectedRequest.id} className="flex items-center justify-center gap-2 rounded-lg bg-[#16A34A] px-3 py-2 text-[11px] font-semibold text-white disabled:opacity-60">
                <FaCheck className="text-[10px]" />
                {updatingRequestId === selectedRequest.id ? "Updating..." : "Approve"}
              </button>
              <button onClick={() => updateWithdrawal("rejected")} disabled={updatingRequestId === selectedRequest.id} className="flex items-center justify-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-[11px] font-semibold text-red-600 disabled:opacity-60">
                <FaTimes className="text-[10px]" />
                {updatingRequestId === selectedRequest.id ? "Updating..." : "Reject"}
              </button>
            </div>
          </aside>
        ) : null}
      </section>
    </div>
  );
}

function ExampleRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return <div className="flex items-center justify-between gap-3"><p className="text-[#6A7282]">{label}</p><p className={strong ? "font-semibold text-[#101828]" : "font-semibold text-[#6A7282]"}>{value}</p></div>;
}

function ToggleRow({ label, checked, onToggle }: { label: string; checked: boolean; onToggle: () => void }) {
  return <div className="flex items-center justify-between gap-4 rounded-xl border border-gray-100 bg-white p-3"><p className="text-[11px] font-semibold text-[#101828]">{label}</p><button onClick={onToggle} className={`h-6 w-11 rounded-full p-1 transition ${checked ? "bg-[#FE9A00]" : "bg-gray-300"}`}><span className={`block h-4 w-4 rounded-full bg-white transition ${checked ? "translate-x-5" : ""}`} /></button></div>;
}

function PanelSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="mt-5"><h4 className="text-xs font-semibold text-[#101828]">{title}</h4><div className="mt-3 space-y-2">{children}</div></section>;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return <div className="flex items-start justify-between gap-4 rounded-lg bg-gray-50 p-3 text-[10px]"><p className="text-[#99A1AF]">{label}</p><p className="max-w-[62%] text-right font-semibold text-[#101828]">{value}</p></div>;
}

function FormField({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return <label className="block"><span className="text-[10px] font-semibold text-[#6A7282]">{label}</span><input {...props} className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-[11px] outline-none focus:border-[#FE9A00] focus:ring-2 focus:ring-[#FE9A00]/10" /></label>;
}

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return <label className="block"><span className="text-[10px] font-semibold text-[#6A7282]">{label}</span><select value={value} onChange={(event) => onChange(event.currentTarget.value)} className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-[11px] outline-none focus:border-[#FE9A00] focus:ring-2 focus:ring-[#FE9A00]/10">{options.map((option) => <option key={option}>{option}</option>)}</select></label>;
}

function StatusPill({ status }: { status: string }) {
  const positive = status === "approved";
  const negative = status === "rejected";
  return <p className={`rounded-lg px-2 py-1 text-center text-[10px] font-semibold capitalize ${positive ? "bg-[#DCFCE7] text-[#10B981]" : negative ? "bg-[#FEF2F2] text-[#FF6467]" : "bg-[#FFF7E0] text-[#B7791F]"}`}>{status}</p>;
}

function SkeletonRows({ count }: { count: number }) {
  return <div className="space-y-2 py-2">{Array.from({ length: count }).map((_, index) => <div key={index} className="h-12 animate-pulse rounded-lg bg-gray-100" />)}</div>;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(amount);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-NG", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}
