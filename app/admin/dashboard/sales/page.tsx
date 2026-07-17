"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  FaBan,
  FaChartLine,
  FaCheck,
  FaCopy,
  FaEllipsisH,
  FaFilter,
  FaFire,
  FaMoneyBillWave,
  FaPen,
  FaPlus,
  FaSearch,
  FaSlidersH,
  FaTrash,
  FaUserFriends,
  FaWallet,
} from "react-icons/fa";
import StatsCard from "@/components/cards/StatsCard";
import { useToastStore } from "@/store/toastStore";

const API_BASE_URL =
  (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000").replace(/\/+$/, "");
const APP_BASE_URL =
  (process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");

type AgentStatus = "active" | "pending" | "influencer" | "suspended";
type AgentTab = "Overview" | "Transactions" | "Referrals";
type Agent = {
  id: string;
  name: string;
  initials: string;
  email: string;
  phone: string;
  status: AgentStatus;
  type: "Agent" | "Influencer";
  area: string;
  downlines: number;
  successfulOrders: number;
  avgTransactions: number;
  commissionRate: number;
  referrals: number;
  revenue: number;
  commission: number;
  upline: string;
  joined: string;
  comboClicks: number;
  conversionRate: number;
  agentCode?: string;
  referralCode?: string;
};

type SalesResponse = {
  stats: {
    totalAgents: number;
    activeThisWeek: number;
    totalReferrals: number;
    influencers: number;
    pendingApprovals: number;
    totalRevenue: number;
    totalCommission: number;
  };
  agents: Agent[];
};

const emptyData: SalesResponse = {
  stats: {
    totalAgents: 0,
    activeThisWeek: 0,
    totalReferrals: 0,
    influencers: 0,
    pendingApprovals: 0,
    totalRevenue: 0,
    totalCommission: 0,
  },
  agents: [],
};

export default function AdminSalesPage() {
  const [status, setStatus] = useState("All");
  const [data, setData] = useState<SalesResponse>(emptyData);
  const [loading, setLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [activeTab, setActiveTab] = useState<AgentTab>("Overview");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [showHighestPanel, setShowHighestPanel] = useState(false);
  const [highestPeriod, setHighestPeriod] = useState("This week");
  const [agentModal, setAgentModal] = useState<"add" | "edit" | null>(null);
  const [actionAgentId, setActionAgentId] = useState<string | null>(null);
  const showToast = useToastStore((s) => s.showToast);

  async function loadSales() {
    const payload = await fetch(`${API_BASE_URL}/admin/sales`, { credentials: "include" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load sales agents");
        return response.json() as Promise<SalesResponse>;
      })
    setData(payload);
    setSelectedAgent((current) =>
      current ? payload.agents.find((agent) => agent.id === current.id) ?? null : null,
    );
  }

  useEffect(() => {
    let mounted = true;

    loadSales()
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const filteredAgents = useMemo(() => {
    if (status === "All") return data.agents;
    return data.agents.filter((agent) => agent.status === status.toLowerCase());
  }, [data.agents, status]);

  const highestAgent = useMemo(
    () => [...data.agents].sort((a, b) => b.revenue - a.revenue)[0] ?? null,
    [data.agents],
  );

  const stats = [
    { id: 1, statTitle: "Total Agents", qty: String(data.stats.totalAgents), crease: "All sales accounts", theme: "bg-[#FFFBEB]", increase: true, icon: <FaUserFriends />, iconColor: "text-[#FE9A00]" },
    { id: 2, statTitle: "Active This Week", qty: String(data.stats.activeThisWeek), crease: "With activity", theme: "bg-[#ECFDF5]", increase: true, icon: <FaChartLine />, iconColor: "text-[#16A34A]" },
    { id: 3, statTitle: "Total Referrals", qty: String(data.stats.totalReferrals), crease: "Customer downlines", theme: "bg-[#EFF6FF]", increase: true, icon: <FaCopy />, iconColor: "text-[#2563EB]" },
    { id: 4, statTitle: "Influencers", qty: String(data.stats.influencers), crease: "Can refer agents", theme: "bg-[#F5F3FF]", increase: true, icon: <FaFire />, iconColor: "text-[#9333EA]" },
    { id: 5, statTitle: "Pending Approvals", qty: String(data.stats.pendingApprovals), crease: "Needs admin review", theme: "bg-[#FFF7E0]", increase: false, icon: <FaCheck />, iconColor: "text-[#B7791F]" },
    { id: 6, statTitle: "Total Revenue", qty: formatCurrency(data.stats.totalRevenue), crease: "Attributed orders", theme: "bg-[#F0FDFA]", increase: true, icon: <FaMoneyBillWave />, iconColor: "text-[#0F766E]" },
    { id: 7, statTitle: "Total Commission", qty: formatCurrency(data.stats.totalCommission), crease: "Agent earnings", theme: "bg-[#FEF2F2]", increase: true, icon: <FaWallet />, iconColor: "text-[#DC2626]" },
  ];

  function openProfile(agent: Agent) {
    setSelectedAgent(agent);
    setActiveTab("Overview");
    setOpenMenuId(null);
  }

  async function updateAgentStatus(agent: Agent, status: "active" | "pending" | "suspended") {
    setActionAgentId(agent.id);
    try {
      const response = await fetch(`${API_BASE_URL}/admin/sales/agents/${agent.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error("Unable to update agent status");
      await loadSales();
      showToast(status === "suspended" ? "Agent suspended" : "Agent reactivated", "success");
      setOpenMenuId(null);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Unable to update agent status", "error");
    } finally {
      setActionAgentId(null);
    }
  }

  async function toggleInfluencer(agent: Agent) {
    setActionAgentId(agent.id);
    try {
      const promoting = agent.status !== "influencer";
      const response = await fetch(`${API_BASE_URL}/admin/sales/agents/${agent.id}/influencer`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ influencer: promoting }),
      });
      if (!response.ok) throw new Error("Unable to update influencer status");
      await loadSales();
      showToast(promoting ? "Agent promoted to influencer" : "Agent demoted from influencer", "success");
      setOpenMenuId(null);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Unable to update influencer status", "error");
    } finally {
      setActionAgentId(null);
    }
  }

  async function removeAgent(agent: Agent) {
    setActionAgentId(agent.id);
    try {
      const response = await fetch(`${API_BASE_URL}/admin/sales/agents/${agent.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Unable to remove agent");
      await loadSales();
      showToast("Agent removed", "success");
      setOpenMenuId(null);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Unable to remove agent", "error");
    } finally {
      setActionAgentId(null);
    }
  }

  async function copyToClipboard(value: string, message = "Copied") {
    try {
      await navigator.clipboard.writeText(value);
      showToast(message, "success");
      setOpenMenuId(null);
    } catch {
      showToast("Unable to copy. Please copy manually.", "error");
    }
  }

  return (
    <div className="pb-10 pr-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-[18px] font-semibold text-[#101828]">Sales Agents & Influencers</h2>
          <p className="text-[11px] text-[#99A1AF]">Manage agent performance, referrals, influencer status and commissions.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" icon={<FaFire />} onClick={() => setShowHighestPanel(true)}>Highest Posting</Button>
          <Link href="/admin/dashboard/sales/settings" className="flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-[11px] font-semibold text-[#6A7282] shadow-sm">
            <FaSlidersH /> Settings
          </Link>
          <Button icon={<FaPlus />} onClick={() => setAgentModal("add")}>Add Agent</Button>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-7 gap-3">
        {stats.map((item) => <StatsCard key={item.id} {...item} />)}
      </div>

      <section className={`mt-8 grid gap-5 ${selectedAgent ? "grid-cols-[1fr_390px]" : "grid-cols-1"}`}>
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-[#101828]">Agent Directory</h3>
              <p className="mt-1 text-[11px] text-[#99A1AF]">Operational view of every agent and influencer.</p>
            </div>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-[10px] text-[#99A1AF]"><FaSearch /><input className="w-36 outline-none" placeholder="Search agents" /></label>
              <label className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-[10px] font-semibold text-[#6A7282]"><FaFilter /><select value={status} onChange={(event) => setStatus(event.currentTarget.value)} className="outline-none"><option>All</option><option>active</option><option>influencer</option><option>pending</option><option>suspended</option></select></label>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-[1.3fr_0.7fr_0.85fr_0.85fr_0.9fr_0.7fr_0.8fr_0.8fr_0.75fr_46px] gap-4 rounded-lg bg-gray-50 p-3 text-[10px] font-semibold text-[#99A1AF]">
            <p>Agent</p><p>Type</p><p>Agent Code</p><p>Avg Transactions</p><p>Commission Rate</p><p>Referrals</p><p>Revenue</p><p>Commission</p><p>Status</p><p>Action</p>
          </div>
          <div className="space-y-1">
            {filteredAgents.map((agent) => (
              <div key={agent.id} className="relative">
                <button onClick={() => openProfile(agent)} className={`grid w-full grid-cols-[1.3fr_0.7fr_0.85fr_0.85fr_0.9fr_0.7fr_0.8fr_0.8fr_0.75fr_46px] items-center gap-4 rounded-lg px-2 py-3 text-left text-[10px] text-[#6A7282] hover:bg-[#FFF7E0] ${selectedAgent?.id === agent.id ? "bg-[#FFF7E0]" : ""}`}>
                  <AgentIdentity agent={agent} />
                  <p>{agent.type}</p>
                  <p>{agent.agentCode ?? "N/A"}</p>
                  <p>{agent.avgTransactions}</p>
                  <p>{agent.commissionRate}%</p>
                  <p>{agent.referrals}</p>
                  <p>{formatCurrency(agent.revenue)}</p>
                  <p>{formatCurrency(agent.commission)}</p>
                  <StatusPill status={agent.status} />
                  <span onClick={(event) => { event.stopPropagation(); setOpenMenuId(openMenuId === agent.id ? null : agent.id); }} className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-[#6A7282]">
                    <FaEllipsisH />
                  </span>
                </button>
                {openMenuId === agent.id ? (
                  <ActionMenu
                    agent={agent}
                    onView={() => openProfile(agent)}
                    onEdit={() => { setSelectedAgent(agent); setAgentModal("edit"); setOpenMenuId(null); }}
                    onInfluencer={() => void toggleInfluencer(agent)}
                    onCopy={() => void copyToClipboard(agent.agentCode ?? agent.id, "Agent code copied")}
                    onSuspend={() => void updateAgentStatus(agent, agent.status === "suspended" ? "active" : "suspended")}
                    onRemove={() => void removeAgent(agent)}
                    loading={actionAgentId === agent.id}
                  />
                ) : null}
              </div>
            ))}
            {!loading && filteredAgents.length === 0 ? <p className="py-8 text-center text-[11px] text-[#99A1AF]">No sales agents found.</p> : null}
          </div>
        </div>

        {selectedAgent ? (
          <aside className="sticky top-24 h-fit max-h-[calc(100vh-7rem)] overflow-y-auto rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <AgentIdentity agent={selectedAgent} large />
              <button onClick={() => setSelectedAgent(null)} className="rounded-lg border border-gray-200 px-2 py-1 text-[10px] font-semibold text-[#6A7282]">Close</button>
            </div>
            <div className="mt-5 grid grid-cols-3 rounded-lg bg-gray-100 p-1">
              {(["Overview", "Transactions", "Referrals"] as const).map((tab) => (
                <button key={tab} onClick={() => setActiveTab(tab)} className={`rounded-md px-2 py-2 text-[10px] font-semibold ${activeTab === tab ? "bg-white text-[#101828] shadow-sm" : "text-[#6A7282]"}`}>{tab}</button>
              ))}
            </div>
            {activeTab === "Overview" ? <AgentOverview agent={selectedAgent} onCopy={copyToClipboard} /> : null}
            {activeTab === "Transactions" ? <AgentTransactions agent={selectedAgent} /> : null}
            {activeTab === "Referrals" ? <AgentReferrals agent={selectedAgent} /> : null}
          </aside>
        ) : null}
      </section>

      {showHighestPanel ? <HighestPostingPanel agent={highestAgent} period={highestPeriod} onPeriodChange={setHighestPeriod} onClose={() => setShowHighestPanel(false)} /> : null}
      {agentModal === "add" ? <AddAgentModal onClose={() => setAgentModal(null)} onSaved={() => { setAgentModal(null); void loadSales(); }} /> : null}
      {agentModal === "edit" ? <EditAgentModal agent={selectedAgent} onClose={() => setAgentModal(null)} onSaved={() => { setAgentModal(null); void loadSales(); }} /> : null}
    </div>
  );
}

function ActionMenu({ agent, onView, onEdit, onInfluencer, onCopy, onSuspend, onRemove, loading }: { agent: Agent; onView: () => void; onEdit: () => void; onInfluencer: () => void; onCopy: () => void; onSuspend: () => void; onRemove: () => void; loading: boolean }) {
  const influencerAction = agent.status === "influencer" ? "Demote from influencer" : "Promote to influencer";
  const statusAction = agent.status === "suspended" ? "Reactivate agent" : "Suspend agent";
  return <div className="absolute right-2 top-12 z-20 w-52 rounded-xl border border-gray-100 bg-white p-2 text-[10px] font-semibold text-[#6A7282] shadow-xl"><MenuButton icon={<FaUserFriends />} label="View full profile" onClick={onView} disabled={loading} /><MenuButton icon={<FaPen />} label="Edit agent details" onClick={onEdit} disabled={loading} /><MenuButton icon={<FaFire />} label={loading ? "Updating..." : influencerAction} onClick={onInfluencer} disabled={loading} /><MenuButton icon={<FaCopy />} label="Copy agent code" onClick={onCopy} disabled={loading} /><MenuButton icon={<FaBan />} label={loading ? "Updating..." : statusAction} danger={agent.status !== "suspended"} onClick={onSuspend} disabled={loading} /><MenuButton icon={<FaTrash />} label={loading ? "Removing..." : "Remove agent"} danger onClick={onRemove} disabled={loading} /></div>;
}

function HighestPostingPanel({ agent, period, onPeriodChange, onClose }: { agent: Agent | null; period: string; onPeriodChange: (value: string) => void; onClose: () => void }) {
  return <div className="fixed inset-y-0 right-0 z-40 w-[420px] border-l border-gray-100 bg-white p-5 shadow-2xl"><div className="flex items-start justify-between gap-4"><div><h2 className="text-sm font-semibold text-[#101828]">Highest Posting Agent</h2><p className="mt-1 text-[11px] text-[#99A1AF]">Best performer for selected period.</p></div><button onClick={onClose} className="rounded-lg border border-gray-200 px-3 py-2 text-[10px] font-semibold text-[#6A7282]">Close</button></div><select value={period} onChange={(event) => onPeriodChange(event.currentTarget.value)} className="mt-5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-[11px] outline-none"><option>This week</option><option>This month</option><option>Last 30 days</option><option>This quarter</option></select>{agent ? <div className="mt-5 rounded-2xl bg-[#FFFBEB] p-4"><AgentIdentity agent={agent} large /><div className="mt-5 grid grid-cols-2 gap-3"><MiniCard label="Revenue" value={formatCurrency(agent.revenue)} /><MiniCard label="Commission" value={formatCurrency(agent.commission)} /><MiniCard label="Referrals" value={String(agent.referrals)} /><MiniCard label="Avg TXN" value={String(agent.avgTransactions)} /></div></div> : null}</div>;
}

function AgentOverview({ agent, onCopy }: { agent: Agent; onCopy: (value: string, message?: string) => void }) {
  const comboLink = `${APP_BASE_URL}/customer/combos?agent=${agent.agentCode ?? agent.id}`;
  const referralLink = agent.status === "influencer" ? `${APP_BASE_URL}/sales/signup?upline=${agent.referralCode ?? agent.id}` : "Unlocked after 10 successful downline orders";
  return <div className="mt-5"><div className="grid grid-cols-2 gap-3"><MiniCard label="Revenue" value={formatCurrency(agent.revenue)} /><MiniCard label="Commission" value={formatCurrency(agent.commission)} /><MiniCard label="Referrals" value={String(agent.referrals)} /><MiniCard label="Conversion" value={`${agent.conversionRate}%`} /></div><Section title="Agent Links"><LinkRow label="Combo tracking link" value={comboLink} onCopy={() => onCopy(comboLink, "Combo tracking link copied")} /><LinkRow label="Influencer referral link" value={referralLink} onCopy={agent.status === "influencer" ? () => onCopy(referralLink, "Influencer referral link copied") : undefined} /></Section><Section title="Profile"><DetailRow label="Email" value={agent.email} /><DetailRow label="Phone" value={agent.phone} /><DetailRow label="Upline" value={agent.upline} /><DetailRow label="Joined" value={formatDate(agent.joined)} /></Section></div>;
}
function AgentTransactions({ agent }: { agent: Agent }) {
  return <div className="mt-5 space-y-2">{["First-order commission", "Combo link order", "Downline order"].map((item, index) => <DetailRow key={item} label={item} value={formatCurrency(index === 0 ? 500 : agent.avgTransactions * 100)} />)}</div>;
}
function AgentReferrals({ agent }: { agent: Agent }) {
  return <div className="mt-5 space-y-2">{Array.from({ length: Math.min(4, agent.referrals) }).map((_, index) => <DetailRow key={index} label={`Referral ${index + 1}`} value={index === 0 ? "Converted" : "Attributed"} />)}{agent.referrals === 0 ? <p className="text-[11px] text-[#99A1AF]">No referrals yet.</p> : null}</div>;
}

function AddAgentModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const showToast = useToastStore((s) => s.showToast);
  const [step, setStep] = useState(1);
  const [agentType, setAgentType] = useState("Sales agent");
  const [level, setLevel] = useState("Starter");
  const [saving, setSaving] = useState(false);
  const steps = ["Personal info", "Agent setup", "Bank details", "Review"];
  async function submit(formData: FormData) {
    if (saving) return;
    setSaving(true);
    try {
      const response = await fetch(`${API_BASE_URL}/admin/sales/agents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          firstName: formData.get("firstName"),
          lastName: formData.get("lastName"),
          address: formData.get("address"),
          phone: formData.get("phone"),
          email: formData.get("email"),
          agentType,
          level,
          referralCode: formData.get("referralCode"),
          bankName: formData.get("bankName"),
          accountNumber: formData.get("accountNumber"),
          accountName: formData.get("accountName"),
        }),
      });
      const payload = await response.json().catch(() => null) as { message?: string } | null;
      if (!response.ok) throw new Error(payload?.message ?? "Unable to add agent");
      showToast("Agent added successfully", "success");
      onSaved();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Unable to add agent", "error");
    } finally {
      setSaving(false);
    }
  }
  return <ModalShell title="Add Agent" subtitle="Create a new sales agent account." onClose={onClose}><form action={submit}><StepTabs steps={steps} step={step} setStep={setStep} /><div className="mt-5"><div className={step === 1 ? "block" : "hidden"}><PersonalInfoStep /></div><div className={step === 2 ? "block" : "hidden"}><AgentSetupStep agentType={agentType} level={level} setAgentType={setAgentType} setLevel={setLevel} /></div><div className={step === 3 ? "block" : "hidden"}><BankDetailsStep /></div><div className={step === 4 ? "block" : "hidden"}><ReviewStep agentType={agentType} level={level} /></div></div><ModalActions step={step} setStep={setStep} onClose={onClose} finalLabel={saving ? "Saving..." : "Submit agent"} disabled={saving} /></form></ModalShell>;
}
function EditAgentModal({ agent, onClose, onSaved }: { agent: Agent | null; onClose: () => void; onSaved: () => void }) {
  const showToast = useToastStore((s) => s.showToast);
  const [saving, setSaving] = useState(false);
  async function submit(formData: FormData) {
    if (!agent) return;
    if (saving) return;
    setSaving(true);
    try {
      const response = await fetch(`${API_BASE_URL}/admin/sales/agents/${agent.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          fullName: formData.get("fullName"),
          phone: formData.get("phone"),
          email: formData.get("email"),
          agentCode: formData.get("agentCode"),
          status: formData.get("status"),
          commissionRate: formData.get("commissionRate"),
        }),
      });
      const payload = await response.json().catch(() => null) as { message?: string } | null;
      if (!response.ok) throw new Error(payload?.message ?? "Unable to update agent");
      showToast("Agent updated successfully", "success");
      onSaved();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Unable to update agent", "error");
    } finally {
      setSaving(false);
    }
  }
  return <ModalShell title="Edit Agent Details" subtitle="Update profile, status and commission configuration." onClose={onClose}><form action={submit}><div className="grid grid-cols-2 gap-4"><FormField name="fullName" label="Full name" defaultValue={agent?.name ?? ""} /><FormField name="phone" label="Phone number" defaultValue={agent?.phone ?? ""} /><FormField name="email" label="Email address" defaultValue={agent?.email ?? ""} /><FormField name="agentCode" label="Agent code" defaultValue={agent?.agentCode ?? ""} /><SelectField name="status" label="Status" options={["active", "pending", "suspended"]} /><FormField name="commissionRate" label="Commission rate" defaultValue={String(agent?.commissionRate ?? 0)} /></div><div className="mt-6 flex justify-end"><Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save changes"}</Button></div></form></ModalShell>;
}
function PersonalInfoStep() {
  return <div className="grid grid-cols-2 gap-4"><UploadBox label="Picture" /><FormField name="firstName" label="First name" /><FormField name="lastName" label="Last name" /><FormField name="address" label="Address" /><FormField name="phone" label="Phone number" /><FormField name="email" label="Email" type="email" /></div>;
}
function AgentSetupStep({ agentType, level, setAgentType, setLevel }: { agentType: string; level: string; setAgentType: (value: string) => void; setLevel: (value: string) => void }) {
  return <div className="space-y-5"><ChoiceGroup label="Agent type" value={agentType} onChange={setAgentType} options={["Sales agent", "Influencer", "Campus rep"]} /><ChoiceGroup label="Starting level" value={level} onChange={setLevel} options={["Starter", "Growth", "Pro"]} /><FormField name="referralCode" label="Referral code" placeholder="Auto-generate or type custom code" /><div className="rounded-xl bg-[#FFFBEB] p-4 text-[11px] text-[#6A7282]"><p className="font-semibold text-[#101828]">Commission preview</p><p className="mt-2">First referred customer order: NGN 500. Influencer upline reward: NGN 100 where applicable.</p></div></div>;
}
function BankDetailsStep() {
  return <div className="grid grid-cols-2 gap-4"><FormField name="bankName" label="Bank name" /><FormField name="accountNumber" label="Account number" /><FormField name="accountName" label="Account name" /><FormField name="payoutNote" label="Payout note" /></div>;
}
function ReviewStep({ agentType, level }: { agentType: string; level: string }) {
  return <div className="rounded-2xl bg-gray-50 p-4"><h3 className="text-xs font-semibold text-[#101828]">Review & submit</h3><div className="mt-4 grid grid-cols-2 gap-3"><MiniCard label="Agent type" value={agentType} /><MiniCard label="Starting level" value={level} /><MiniCard label="Approval" value="Admin controlled" /><MiniCard label="Payout" value="Bank transfer" /></div></div>;
}
function ChoiceGroup({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return <div><p className="text-[10px] font-semibold text-[#6A7282]">{label}</p><div className="mt-2 grid grid-cols-3 gap-3">{options.map((option) => <button type="button" key={option} onClick={() => onChange(option)} className={`rounded-xl border p-3 text-[10px] font-semibold ${value === option ? "border-[#FE9A00] bg-[#FFFBEB] text-[#101828]" : "border-gray-200 text-[#6A7282]"}`}>{option}</button>)}</div></div>;
}
function StepTabs({ steps, step, setStep }: { steps: string[]; step: number; setStep: (value: number) => void }) {
  return <div className="grid grid-cols-4 gap-2">{steps.map((item, index) => <button type="button" key={item} onClick={() => setStep(index + 1)} className={`rounded-lg border px-3 py-2 text-left text-[10px] font-semibold ${step === index + 1 ? "border-[#FE9A00] bg-[#FFFBEB] text-[#101828]" : "border-gray-200 text-[#6A7282]"}`}><span className="block text-[9px] text-[#99A1AF]">Step {index + 1}</span>{item}</button>)}</div>;
}
function ModalActions({ step, setStep, onClose, finalLabel, disabled }: { step: number; setStep: (value: number) => void; onClose: () => void; finalLabel: string; disabled?: boolean }) {
  return <div className="mt-6 flex items-center justify-between border-t border-gray-100 pt-4"><button type="button" disabled={disabled} onClick={step === 1 ? onClose : () => setStep(step - 1)} className="rounded-lg border border-gray-200 px-4 py-2 text-[11px] font-semibold text-[#6A7282] disabled:cursor-not-allowed disabled:opacity-60">{step === 1 ? "Cancel" : "Back"}</button>{step === 4 ? <Button type="submit" disabled={disabled}>{finalLabel}</Button> : <Button type="button" onClick={() => setStep(step + 1)} disabled={disabled}>Continue</Button>}</div>;
}
function ModalShell({ title, subtitle, children, onClose }: { title: string; subtitle: string; children: React.ReactNode; onClose: () => void }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 backdrop-blur-sm"><div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl"><div className="flex items-start justify-between gap-4"><div><h2 className="text-sm font-semibold text-[#101828]">{title}</h2><p className="mt-1 text-[11px] text-[#6A7282]">{subtitle}</p></div><button onClick={onClose} className="rounded-lg border border-gray-200 px-3 py-2 text-[10px] font-semibold text-[#6A7282]">Close</button></div><div className="mt-5">{children}</div></div></div>;
}
function MenuButton({ icon, label, danger, disabled, onClick }: { icon: React.ReactNode; label: string; danger?: boolean; disabled?: boolean; onClick?: () => void }) {
  return <button disabled={disabled} onClick={onClick} className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 ${danger ? "text-red-600" : ""}`}>{icon}{label}</button>;
}
function AgentIdentity({ agent, large }: { agent: Agent; large?: boolean }) {
  return <div className="flex min-w-0 items-center gap-3"><div className={`${large ? "h-11 w-11 text-sm" : "h-8 w-8 text-[10px]"} flex shrink-0 items-center justify-center rounded-full bg-[#FE9A00] font-semibold text-white`}>{agent.initials}</div><div className="min-w-0"><p className={`${large ? "text-sm" : "text-[10px]"} truncate font-semibold text-[#101828]`}>{agent.name}</p><p className="truncate text-[10px] text-[#99A1AF]">{agent.phone}</p></div></div>;
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="mt-5"><h4 className="text-xs font-semibold text-[#101828]">{title}</h4><div className="mt-3 space-y-2">{children}</div></section>;
}
function LinkRow({ label, value, onCopy }: { label: string; value: string; onCopy?: () => void }) {
  return <button type="button" onClick={onCopy} disabled={!onCopy} className="w-full rounded-xl bg-gray-50 p-3 text-left text-[10px] disabled:cursor-default"><p className="text-[#99A1AF]">{label}</p><div className="mt-2 flex items-center justify-between gap-3"><p className="truncate font-semibold text-[#101828]">{value}</p>{onCopy ? <FaCopy className="shrink-0 text-[#FE9A00]" /> : null}</div></button>;
}
function DetailRow({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between gap-4 rounded-lg bg-gray-50 p-3 text-[10px]"><p className="text-[#99A1AF]">{label}</p><p className="text-right font-semibold text-[#101828]">{value}</p></div>;
}
function MiniCard({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-gray-50 p-3"><p className="text-[10px] text-[#99A1AF]">{label}</p><p className="mt-2 text-xs font-semibold text-[#101828]">{value}</p></div>;
}
function UploadBox({ label }: { label: string }) {
  const [previewUrl, setPreviewUrl] = useState("");
  return <label className="flex min-h-[130px] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-4 text-center hover:border-[#FE9A00]">{previewUrl ? <img src={previewUrl} alt="" className="mb-3 h-16 w-16 rounded-full object-cover" /> : <FaPlus className="text-[#FE9A00]" />}<input type="file" accept="image/*" className="sr-only" onChange={(event) => { const file = event.currentTarget.files?.[0]; if (file) setPreviewUrl(URL.createObjectURL(file)); }} /><p className="mt-2 text-[11px] font-semibold text-[#101828]">{previewUrl ? "Picture selected" : label}</p><p className="mt-1 text-[10px] text-[#99A1AF]">Click to choose image</p></label>;
}
function FormField({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return <label className="block"><span className="text-[10px] font-semibold text-[#6A7282]">{label}</span><input {...props} className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-[11px] outline-none focus:border-[#FE9A00] focus:ring-2 focus:ring-[#FE9A00]/10" /></label>;
}
function SelectField({ label, options, name }: { label: string; options: string[]; name?: string }) {
  return <label className="block"><span className="text-[10px] font-semibold text-[#6A7282]">{label}</span><select name={name} className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-[11px] outline-none focus:border-[#FE9A00] focus:ring-2 focus:ring-[#FE9A00]/10">{options.map((option) => <option key={option}>{option}</option>)}</select></label>;
}
function Button({ children, icon, variant = "primary", onClick, type = "button", disabled }: { children: React.ReactNode; icon?: React.ReactNode; variant?: "primary" | "secondary" | "danger"; onClick?: () => void; type?: "button" | "submit"; disabled?: boolean }) {
  const style = variant === "primary" ? "bg-[#FE9A00] text-white" : variant === "danger" ? "border border-red-200 bg-red-50 text-red-600" : "border border-gray-200 bg-white text-[#6A7282]";
  return <button type={type} disabled={disabled} onClick={onClick} className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-[11px] font-semibold shadow-sm disabled:cursor-not-allowed disabled:opacity-60 ${style}`}>{icon}{children}</button>;
}
function StatusPill({ status }: { status: AgentStatus }) {
  const styles = { active: "bg-[#DCFCE7] text-[#16A34A]", influencer: "bg-[#F5F3FF] text-[#9333EA]", pending: "bg-[#FFF7E0] text-[#B7791F]", suspended: "bg-[#FEF2F2] text-[#DC2626]" };
  return <p className={`rounded-lg px-2 py-1 text-center text-[10px] font-semibold capitalize ${styles[status]}`}>{status}</p>;
}
function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(amount);
}
function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-NG", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}
