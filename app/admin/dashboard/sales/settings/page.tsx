"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { FaArrowLeft, FaGift, FaMoneyBillWave, FaPercent, FaUniversity, FaWallet } from "react-icons/fa";

const API_BASE_URL =
  (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000").replace(/\/+$/, "");

type SettingsTab = "Commission tax" | "Withdrawal settings" | "Referral rewards" | "Payout settings" | "Taxation settings";
type SettingsSection = "commissionTax" | "withdrawalSettings" | "referralRewards" | "payoutSettings" | "taxationSettings";
type SettingValue = string | number | boolean;
type SalesSettings = Record<SettingsSection, Record<string, SettingValue>>;

const tabs: SettingsTab[] = ["Commission tax", "Withdrawal settings", "Referral rewards", "Payout settings", "Taxation settings"];

const defaultSettings: SalesSettings = {
  commissionTax: {
    defaultCommissionAmount: 500,
    influencerUplineReward: 100,
    deductWithholdingTax: true,
    taxDeductionRate: 0,
  },
  withdrawalSettings: {
    minimumWithdrawal: 5000,
    maximumPendingRequests: 1,
    allowManualWithdrawalRequests: true,
    requireAdminApproval: true,
  },
  referralRewards: {
    customerReferralReward: 500,
    influencerUplineReward: 100,
    qualificationThreshold: 10,
    autoNotifyQualifiedInfluencers: true,
  },
  payoutSettings: {
    frequency: "Weekly",
    payoutTime: "17:00",
    autoProcessApprovedPayouts: false,
    holdSuspendedAgentPayouts: true,
  },
  taxationSettings: {
    taxLabel: "Withholding tax",
    taxIdRequirementThreshold: 50000,
    requireTaxIdBeforeLargePayouts: false,
    showTaxBreakdownOnReceipt: true,
  },
};

export default function SalesSettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("Commission tax");
  const [settings, setSettings] = useState<SalesSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let mounted = true;

    fetch(`${API_BASE_URL}/admin/sales/settings`, { credentials: "include" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load sales settings");
        return response.json() as Promise<{ settings: SalesSettings }>;
      })
      .then((payload) => {
        if (mounted) setSettings({ ...defaultSettings, ...payload.settings });
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  function updateSetting(section: SettingsSection, key: string, value: SettingValue) {
    setSettings((current) => ({
      ...current,
      [section]: {
        ...current[section],
        [key]: value,
      },
    }));
  }

  async function saveSettings() {
    setSaving(true);
    setNotice("");

    try {
      const response = await fetch(`${API_BASE_URL}/admin/sales/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(settings),
      });

      if (!response.ok) throw new Error("Unable to save sales settings");
      const payload = (await response.json()) as { settings: SalesSettings };
      setSettings({ ...defaultSettings, ...payload.settings });
      setNotice("Settings saved.");
    } catch {
      setNotice("Unable to save settings. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const props = { settings, updateSetting, onSave: saveSettings, saving };

  return (
    <div className="pb-10 pr-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <Link href="/admin/dashboard/sales" className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-[#6A7282]">
              <FaArrowLeft className="text-[12px]" />
            </Link>
            <h2 className="text-[18px] font-semibold text-[#101828]">Sales Agent Settings</h2>
          </div>
          <p className="mt-2 text-[11px] text-[#99A1AF]">Configure commissions, referrals, tax handling, withdrawals and payout behavior.</p>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-5 gap-2 rounded-2xl bg-gray-100 p-1">
        {tabs.map((tab) => (
          <button type="button" key={tab} onClick={() => setActiveTab(tab)} className={`rounded-xl px-3 py-3 text-[10px] font-semibold ${activeTab === tab ? "bg-white text-[#101828] shadow-sm" : "text-[#6A7282]"}`}>
            {tab}
          </button>
        ))}
      </div>

      <section className="mt-6 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        {loading ? (
          <div className="grid grid-cols-2 gap-4">
            {Array.from({ length: 6 }).map((_, index) => <div key={index} className="h-16 animate-pulse rounded-xl bg-gray-100" />)}
          </div>
        ) : null}
        {!loading && activeTab === "Commission tax" ? <CommissionTax {...props} /> : null}
        {!loading && activeTab === "Withdrawal settings" ? <WithdrawalSettings {...props} /> : null}
        {!loading && activeTab === "Referral rewards" ? <ReferralRewards {...props} /> : null}
        {!loading && activeTab === "Payout settings" ? <PayoutSettings {...props} /> : null}
        {!loading && activeTab === "Taxation settings" ? <TaxationSettings {...props} /> : null}
        {notice ? <p className="mt-4 text-right text-[11px] font-semibold text-[#6A7282]">{notice}</p> : null}
      </section>
    </div>
  );
}

type SettingsProps = {
  settings: SalesSettings;
  updateSetting: (section: SettingsSection, key: string, value: SettingValue) => void;
  onSave: () => void;
  saving: boolean;
};

function CommissionTax(props: SettingsProps) {
  const section = "commissionTax";
  return (
    <SettingsGrid icon={<FaPercent />} title="Commission Tax" subtitle="Control how deductions apply before agent commissions are released." onSave={props.onSave} saving={props.saving}>
      <FormField label="Default commission amount" value={props.settings[section].defaultCommissionAmount} suffix="NGN first order" onChange={(value) => props.updateSetting(section, "defaultCommissionAmount", value)} />
      <FormField label="Influencer upline reward" value={props.settings[section].influencerUplineReward} suffix="NGN first order" onChange={(value) => props.updateSetting(section, "influencerUplineReward", value)} />
      <Toggle label="Deduct withholding tax before payout" checked={Boolean(props.settings[section].deductWithholdingTax)} onChange={(value) => props.updateSetting(section, "deductWithholdingTax", value)} />
      <FormField label="Tax deduction rate" value={props.settings[section].taxDeductionRate} suffix="%" onChange={(value) => props.updateSetting(section, "taxDeductionRate", value)} />
    </SettingsGrid>
  );
}

function WithdrawalSettings(props: SettingsProps) {
  const section = "withdrawalSettings";
  return (
    <SettingsGrid icon={<FaWallet />} title="Withdrawal Settings" subtitle="Define when and how sales agents can request withdrawals." onSave={props.onSave} saving={props.saving}>
      <FormField label="Minimum withdrawal" value={props.settings[section].minimumWithdrawal} suffix="NGN" onChange={(value) => props.updateSetting(section, "minimumWithdrawal", value)} />
      <FormField label="Maximum pending requests" value={props.settings[section].maximumPendingRequests} onChange={(value) => props.updateSetting(section, "maximumPendingRequests", value)} />
      <Toggle label="Allow manual withdrawal requests" checked={Boolean(props.settings[section].allowManualWithdrawalRequests)} onChange={(value) => props.updateSetting(section, "allowManualWithdrawalRequests", value)} />
      <Toggle label="Require admin approval for every withdrawal" checked={Boolean(props.settings[section].requireAdminApproval)} onChange={(value) => props.updateSetting(section, "requireAdminApproval", value)} />
    </SettingsGrid>
  );
}

function ReferralRewards(props: SettingsProps) {
  const section = "referralRewards";
  return (
    <SettingsGrid icon={<FaGift />} title="Referral Rewards" subtitle="Rewards follow the first-successful-order rule we defined earlier." onSave={props.onSave} saving={props.saving}>
      <FormField label="Customer referral reward" value={props.settings[section].customerReferralReward} suffix="NGN" onChange={(value) => props.updateSetting(section, "customerReferralReward", value)} />
      <FormField label="Influencer upline reward" value={props.settings[section].influencerUplineReward} suffix="NGN" onChange={(value) => props.updateSetting(section, "influencerUplineReward", value)} />
      <FormField label="Qualification threshold" value={props.settings[section].qualificationThreshold} suffix="successful orders" onChange={(value) => props.updateSetting(section, "qualificationThreshold", value)} />
      <Toggle label="Auto notify qualified influencers" checked={Boolean(props.settings[section].autoNotifyQualifiedInfluencers)} onChange={(value) => props.updateSetting(section, "autoNotifyQualifiedInfluencers", value)} />
    </SettingsGrid>
  );
}

function PayoutSettings(props: SettingsProps) {
  const section = "payoutSettings";
  return (
    <SettingsGrid icon={<FaUniversity />} title="Payout Settings" subtitle="Schedule commission releases and payout processing." onSave={props.onSave} saving={props.saving}>
      <SelectField label="Payout frequency" value={String(props.settings[section].frequency)} options={["Daily", "Weekly", "Bi-weekly", "Monthly"]} onChange={(value) => props.updateSetting(section, "frequency", value)} />
      <FormField label="Payout time" value={props.settings[section].payoutTime} type="time" onChange={(value) => props.updateSetting(section, "payoutTime", value)} />
      <Toggle label="Auto process approved payouts" checked={Boolean(props.settings[section].autoProcessApprovedPayouts)} onChange={(value) => props.updateSetting(section, "autoProcessApprovedPayouts", value)} />
      <Toggle label="Hold payouts for suspended agents" checked={Boolean(props.settings[section].holdSuspendedAgentPayouts)} onChange={(value) => props.updateSetting(section, "holdSuspendedAgentPayouts", value)} />
    </SettingsGrid>
  );
}

function TaxationSettings(props: SettingsProps) {
  const section = "taxationSettings";
  return (
    <SettingsGrid icon={<FaMoneyBillWave />} title="Taxation Settings" subtitle="Keep tax treatment explicit for agent earnings and reporting." onSave={props.onSave} saving={props.saving}>
      <FormField label="Tax label" value={props.settings[section].taxLabel} onChange={(value) => props.updateSetting(section, "taxLabel", value)} />
      <FormField label="Tax ID requirement threshold" value={props.settings[section].taxIdRequirementThreshold} suffix="NGN monthly" onChange={(value) => props.updateSetting(section, "taxIdRequirementThreshold", value)} />
      <Toggle label="Require tax ID before large payouts" checked={Boolean(props.settings[section].requireTaxIdBeforeLargePayouts)} onChange={(value) => props.updateSetting(section, "requireTaxIdBeforeLargePayouts", value)} />
      <Toggle label="Show tax breakdown on payout receipt" checked={Boolean(props.settings[section].showTaxBreakdownOnReceipt)} onChange={(value) => props.updateSetting(section, "showTaxBreakdownOnReceipt", value)} />
    </SettingsGrid>
  );
}

function SettingsGrid({ icon, title, subtitle, children, onSave, saving }: { icon: ReactNode; title: string; subtitle: string; children: ReactNode; onSave: () => void; saving: boolean }) {
  return <div><div className="flex items-start gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FFFBEB] text-[#FE9A00]">{icon}</div><div><h3 className="text-sm font-semibold text-[#101828]">{title}</h3><p className="mt-1 text-[11px] text-[#99A1AF]">{subtitle}</p></div></div><div className="mt-6 grid grid-cols-2 gap-4">{children}</div><div className="mt-6 flex justify-end"><button type="button" disabled={saving} onClick={onSave} className="rounded-lg bg-[#FE9A00] px-4 py-2 text-[11px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">{saving ? "Saving..." : "Save settings"}</button></div></div>;
}

function FormField({ label, suffix, value, onChange, type = "number" }: { label: string; suffix?: string; value: SettingValue; type?: string; onChange: (value: SettingValue) => void }) {
  return <label className="block"><span className="text-[10px] font-semibold text-[#6A7282]">{label}</span><div className="mt-2 flex overflow-hidden rounded-xl border border-gray-200 bg-white focus-within:border-[#FE9A00] focus-within:ring-2 focus-within:ring-[#FE9A00]/10"><input type={type} value={String(value)} onChange={(event) => onChange(type === "number" ? Number(event.currentTarget.value) : event.currentTarget.value)} className="min-w-0 flex-1 px-3 py-2.5 text-[11px] outline-none" />{suffix ? <span className="border-l border-gray-200 px-3 py-2.5 text-[10px] text-[#99A1AF]">{suffix}</span> : null}</div></label>;
}

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return <label className="block"><span className="text-[10px] font-semibold text-[#6A7282]">{label}</span><select value={value} onChange={(event) => onChange(event.currentTarget.value)} className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-[11px] outline-none focus:border-[#FE9A00] focus:ring-2 focus:ring-[#FE9A00]/10">{options.map((option) => <option key={option}>{option}</option>)}</select></label>;
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <div className="flex items-center justify-between gap-4 rounded-xl border border-gray-100 bg-gray-50 p-3"><p className="text-[11px] font-semibold text-[#101828]">{label}</p><button type="button" onClick={() => onChange(!checked)} className={`h-6 w-11 rounded-full p-1 transition ${checked ? "bg-[#FE9A00]" : "bg-gray-300"}`}><span className={`block h-4 w-4 rounded-full bg-white transition ${checked ? "translate-x-5" : ""}`} /></button></div>;
}
