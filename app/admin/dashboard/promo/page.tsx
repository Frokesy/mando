"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  FaBold,
  FaBullhorn,
  FaCalendarAlt,
  FaCheckCircle,
  FaClock,
  FaGift,
  FaImage,
  FaItalic,
  FaListUl,
  FaMapMarkerAlt,
  FaPause,
  FaPercent,
  FaPlus,
  FaSearch,
  FaShareAlt,
  FaTags,
  FaTicketAlt,
  FaTruck,
  FaUnderline,
  FaUserFriends,
} from "react-icons/fa";
import StatsCard from "@/components/cards/StatsCard";

const API_BASE_URL =
  (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000").replace(/\/+$/, "");

type CampaignStatus = "active" | "scheduled" | "paused" | "ended";
type Campaign = {
  id: string;
  name: string;
  channel: string;
  audience: string;
  budget: number;
  redemptions: number;
  revenue: number;
  status: CampaignStatus;
  startsAt: string;
  endsAt: string;
  offer: string;
  imageUrl: string | null;
};

type PromoResponse = {
  stats: {
    campaigns: number;
    activePromos: number;
    redemptions: number;
    promoRevenue: number;
  };
  campaigns: Campaign[];
  couponRules: string;
  coupons: { code: string; usage: number; limit: number; status: string }[];
};

type CloudinarySignatureResponse = {
  upload: {
    apiKey: string;
    timestamp: number;
    signature: string;
    folder: string;
    publicId: string;
    uploadUrl: string;
  };
};

type CloudinaryUploadResponse = {
  secure_url: string;
};

type UploadProgress = {
  label: string;
  percent: number;
};

type CampaignType = "Flash sale" | "Discount" | "Free delivery" | "Promo code" | "Referral" | "Loyalty";

const emptyData: PromoResponse = {
  stats: { campaigns: 0, activePromos: 0, redemptions: 0, promoRevenue: 0 },
  campaigns: [],
  couponRules: "",
  coupons: [],
};

const campaignTypes: { name: CampaignType; subtext: string; icon: React.ReactNode; style: string }[] = [
  { name: "Flash sale", subtext: "Short high-urgency promo", icon: <FaClock />, style: "bg-[#FFF7E0] text-[#B7791F] border-[#FDE68A]" },
  { name: "Discount", subtext: "Percentage or fixed amount", icon: <FaPercent />, style: "bg-[#ECFDF5] text-[#047857] border-[#A7F3D0]" },
  { name: "Free delivery", subtext: "Remove delivery friction", icon: <FaTruck />, style: "bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE]" },
  { name: "Promo code", subtext: "Code-based redemption", icon: <FaTicketAlt />, style: "bg-[#F5F3FF] text-[#7E22CE] border-[#DDD6FE]" },
  { name: "Referral", subtext: "Agent/customer growth", icon: <FaShareAlt />, style: "bg-[#FDF2F8] text-[#BE185D] border-[#FBCFE8]" },
  { name: "Loyalty", subtext: "Reward repeat buyers", icon: <FaGift />, style: "bg-[#F0FDFA] text-[#0F766E] border-[#99F6E4]" },
];

const audienceTypes = ["All customers", "New customers", "Returning customers", "Inactive customers", "Sales agent traffic", "Restaurant fans"];
const locationSuggestions = ["Fashina", "NASFAT Area", "OAU Gate", "Mayfair", "Ile-Ife"];

export default function AdminPromoPage() {
  const [filter, setFilter] = useState("All");
  const [data, setData] = useState<PromoResponse>(emptyData);
  const [loading, setLoading] = useState(true);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [showCouponRules, setShowCouponRules] = useState(false);
  const [campaignModalMode, setCampaignModalMode] = useState<"add" | "edit" | null>(null);
  const [notice, setNotice] = useState("");

  async function loadPromo() {
    const payload = await fetch(`${API_BASE_URL}/admin/promo`, { credentials: "include" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load promo dashboard");
        return response.json() as Promise<PromoResponse>;
      });
    setData(payload);
    setSelectedCampaign((current) => current ? payload.campaigns.find((campaign) => campaign.id === current.id) ?? payload.campaigns[0] ?? null : payload.campaigns[0] ?? null);
  }

  useEffect(() => {
    let mounted = true;

    loadPromo()
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const filteredCampaigns = useMemo(() => {
    if (filter === "All") return data.campaigns;
    return data.campaigns.filter((campaign) => campaign.status === filter.toLowerCase());
  }, [data.campaigns, filter]);

  async function updateCampaignStatus(campaign: Campaign, status: CampaignStatus) {
    setNotice("");
    const response = await fetch(`${API_BASE_URL}/admin/promo/campaigns/${campaign.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ ...campaign, status }),
    });
    setNotice(response.ok ? "Campaign updated." : "Unable to update campaign.");
    if (response.ok) await loadPromo();
  }

  const stats = [
    { id: 1, statTitle: "Campaigns", qty: String(data.stats.campaigns), crease: "Marketing plans", theme: "bg-[#FFFBEB]", increase: true, icon: <FaBullhorn />, iconColor: "text-[#FE9A00]" },
    { id: 2, statTitle: "Active Promos", qty: String(data.stats.activePromos), crease: "Live now", theme: "bg-[#ECFDF5]", increase: true, icon: <FaCheckCircle />, iconColor: "text-[#16A34A]" },
    { id: 3, statTitle: "Redemptions", qty: String(data.stats.redemptions), crease: "Coupon usage", theme: "bg-[#EFF6FF]", increase: true, icon: <FaTicketAlt />, iconColor: "text-[#2563EB]" },
    { id: 4, statTitle: "Promo Revenue", qty: formatCurrency(data.stats.promoRevenue), crease: "Attributed sales", theme: "bg-[#F5F3FF]", increase: true, icon: <FaGift />, iconColor: "text-[#9333EA]" },
  ];

  return (
    <div className="pb-10 pr-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-[18px] font-semibold text-[#101828]">Promo & Marketing</h2>
          <p className="text-[11px] text-[#99A1AF]">Create campaigns, manage coupon codes, and track promo impact on orders.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" icon={<FaTags />} onClick={() => setShowCouponRules(true)}>Coupon rules</Button>
          <Button icon={<FaPlus />} onClick={() => setCampaignModalMode("add")}>Create campaign</Button>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-4 gap-3">
        {stats.map((item) => <StatsCard key={item.id} {...item} />)}
      </div>

      <div className="mt-8 grid grid-cols-[1fr_380px] gap-5">
        <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><h3 className="text-sm font-semibold text-[#101828]">Campaigns</h3><p className="mt-1 text-[11px] text-[#99A1AF]">Promos across customer, agent and restaurant channels.</p></div>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-[10px] text-[#99A1AF]"><FaSearch /><input className="w-36 outline-none" placeholder="Search promos" /></label>
              <select value={filter} onChange={(event) => setFilter(event.currentTarget.value)} className="rounded-lg border border-gray-200 px-3 py-2 text-[10px] font-semibold text-[#6A7282]"><option>All</option><option>active</option><option>scheduled</option><option>paused</option><option>ended</option></select>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-[1.4fr_1fr_1fr_0.7fr_0.8fr_0.8fr_0.8fr] gap-4 rounded-lg bg-gray-50 p-3 text-[10px] font-semibold text-[#99A1AF]">
            <p>Campaign</p><p>Channel</p><p>Audience</p><p>Budget</p><p>Redemptions</p><p>Revenue</p><p>Status</p>
          </div>
          <div className="space-y-1">
            {filteredCampaigns.map((campaign) => (
              <button key={campaign.id} onClick={() => setSelectedCampaign(campaign)} className={`grid w-full grid-cols-[1.4fr_1fr_1fr_0.7fr_0.8fr_0.8fr_0.8fr] items-center gap-4 rounded-lg px-2 py-3 text-left text-[10px] text-[#6A7282] hover:bg-[#FFF7E0] ${selectedCampaign?.id === campaign.id ? "bg-[#FFF7E0]" : ""}`}>
                <div className="flex min-w-0 items-center gap-3">
                  <div className="h-9 w-9 shrink-0 overflow-hidden rounded-xl bg-gray-100">
                    {campaign.imageUrl ? <img src={campaign.imageUrl} alt="" className="h-full w-full object-cover" /> : null}
                  </div>
                  <p className="truncate font-semibold text-[#101828]">{campaign.name}</p>
                </div>
                <p>{campaign.channel}</p><p>{campaign.audience}</p><p>{formatCurrency(campaign.budget)}</p><p>{campaign.redemptions}</p><p>{formatCurrency(campaign.revenue)}</p><StatusPill status={campaign.status} />
              </button>
            ))}
            {!loading && filteredCampaigns.length === 0 ? <p className="py-8 text-center text-[11px] text-[#99A1AF]">No campaigns found.</p> : null}
          </div>
        </section>

        <aside className="sticky top-24 h-fit space-y-5">
          {selectedCampaign ? (
            <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div><h3 className="text-sm font-semibold text-[#101828]">{selectedCampaign.name}</h3><p className="mt-1 text-[10px] text-[#99A1AF]">{selectedCampaign.offer}</p></div>
                <div className="flex items-center gap-2">
                  <StatusPill status={selectedCampaign.status} />
                  <button onClick={() => setSelectedCampaign(null)} className="rounded-lg border border-gray-200 px-2 py-1 text-[10px] font-semibold text-[#6A7282]">Close</button>
                </div>
              </div>
              <div className="mt-4 overflow-hidden rounded-2xl bg-gray-100">
                {selectedCampaign.imageUrl ? <img src={selectedCampaign.imageUrl} alt="" className="h-36 w-full object-cover" /> : <div className="flex h-36 items-center justify-center text-[#99A1AF]"><FaImage /></div>}
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <MiniCard label="Budget" value={formatCurrency(selectedCampaign.budget)} />
                <MiniCard label="Revenue" value={formatCurrency(selectedCampaign.revenue)} />
                <MiniCard label="Starts" value={formatDate(selectedCampaign.startsAt)} />
                <MiniCard label="Ends" value={formatDate(selectedCampaign.endsAt)} />
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <Button icon={<FaCalendarAlt />} onClick={() => setCampaignModalMode("edit")}>Edit</Button>
                <Button variant="danger" icon={<FaPause />} onClick={() => updateCampaignStatus(selectedCampaign, "paused")}>Pause</Button>
              </div>
            </section>
          ) : null}

          <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-[#101828]">Coupon Codes</h3>
            <p className="mt-1 text-[11px] text-[#99A1AF]">Active and scheduled redemption codes.</p>
            <div className="mt-4 space-y-3">
              {data.coupons.map((coupon) => (
                <div key={coupon.code} className="rounded-xl bg-gray-50 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[11px] font-semibold text-[#101828]">{coupon.code}</p>
                    <p className="rounded-lg bg-white px-2 py-1 text-[10px] font-semibold capitalize text-[#6A7282]">{coupon.status}</p>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
                    <div className="h-full rounded-full bg-[#FE9A00]" style={{ width: `${Math.min(100, (coupon.usage / coupon.limit) * 100)}%` }} />
                  </div>
                  <p className="mt-2 text-[10px] text-[#99A1AF]">{coupon.usage}/{coupon.limit} used</p>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>

      {notice ? <p className="fixed bottom-6 right-6 z-50 rounded-xl bg-[#101828] px-4 py-3 text-[11px] font-semibold text-white shadow-xl">{notice}</p> : null}
      {showCouponRules ? <CouponRulesModal initialRules={data.couponRules} onClose={() => setShowCouponRules(false)} onSaved={() => { setShowCouponRules(false); void loadPromo(); }} /> : null}
      {campaignModalMode ? (
        <CampaignModal mode={campaignModalMode} campaign={campaignModalMode === "edit" ? selectedCampaign : null} onClose={() => setCampaignModalMode(null)} onSaved={() => { setCampaignModalMode(null); void loadPromo(); }} />
      ) : null}
    </div>
  );
}

function CouponRulesModal({ initialRules, onClose, onSaved }: { initialRules: string; onClose: () => void; onSaved: () => void }) {
  const [text, setText] = useState(initialRules);
  const [saving, setSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  function formatSelection(format: "bold" | "italic" | "underline" | "list") {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = text.slice(start, end) || "text";
    const formatted = format === "bold"
      ? `**${selected}**`
      : format === "italic"
        ? `*${selected}*`
        : format === "underline"
          ? `<u>${selected}</u>`
          : selected.split("\n").map((line) => line.startsWith("- ") ? line : `- ${line}`).join("\n");
    setText(`${text.slice(0, start)}${formatted}${text.slice(end)}`);
    requestAnimationFrame(() => textarea.focus());
  }

  async function saveRules() {
    setSaving(true);
    const response = await fetch(`${API_BASE_URL}/admin/promo/rules`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ rules: text }),
    });
    setSaving(false);
    if (response.ok) onSaved();
  }

  return (
    <ModalShell title="Coupon rules" subtitle="Define coupon terms customers and admins should follow." onClose={onClose}>
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-2">
        <div className="flex flex-wrap items-center gap-1 border-b border-gray-200 pb-2">
          <button type="button" onClick={() => formatSelection("bold")} className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-[11px] text-[#6A7282] shadow-sm"><FaBold /></button>
          <button type="button" onClick={() => formatSelection("italic")} className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-[11px] text-[#6A7282] shadow-sm"><FaItalic /></button>
          <button type="button" onClick={() => formatSelection("underline")} className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-[11px] text-[#6A7282] shadow-sm"><FaUnderline /></button>
          <button type="button" onClick={() => formatSelection("list")} className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-[11px] text-[#6A7282] shadow-sm"><FaListUl /></button>
          <select className="ml-2 rounded-lg border border-gray-200 bg-white px-2 py-2 text-[10px] text-[#6A7282]"><option>Normal text</option><option>Heading</option><option>Small note</option></select>
          <select className="rounded-lg border border-gray-200 bg-white px-2 py-2 text-[10px] text-[#6A7282]"><option>Left</option><option>Center</option><option>Right</option></select>
        </div>
        <textarea ref={textareaRef} value={text} onChange={(event) => setText(event.currentTarget.value)} className="mt-3 min-h-[220px] w-full resize-none rounded-xl border border-gray-200 bg-white p-3 text-[11px] leading-5 outline-none focus:border-[#FE9A00] focus:ring-2 focus:ring-[#FE9A00]/10" />
      </div>
      <div className="mt-5 flex justify-end">
        <Button onClick={saveRules} disabled={saving}>{saving ? "Saving..." : "Save rules"}</Button>
      </div>
    </ModalShell>
  );
}

function CampaignModal({ mode, campaign, onClose, onSaved }: { mode: "add" | "edit"; campaign: Campaign | null; onClose: () => void; onSaved: () => void }) {
  const [step, setStep] = useState(1);
  const [selectedType, setSelectedType] = useState<CampaignType>("Discount");
  const [selectedAudience, setSelectedAudience] = useState(campaign?.audience ?? "All customers");
  const [selectedChannel, setSelectedChannel] = useState(campaign?.channel ?? "In-app");
  const [bannerPreview, setBannerPreview] = useState<string | null>(campaign?.imageUrl ?? null);
  const [location, setLocation] = useState("");
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const steps = ["Type & banner", "Details", "Audience", "Schedule"];

  useEffect(() => {
    return () => {
      if (bannerPreview?.startsWith("blob:")) URL.revokeObjectURL(bannerPreview);
    };
  }, [bannerPreview]);

  async function submit(formData: FormData) {
    setSaving(true);
    setProgress(null);
    try {
      const imageUrl = await uploadAdminImage(getSelectedFile(formData, "bannerImage"), "promo_banner", setProgress);
      const response = await fetch(`${API_BASE_URL}/admin/promo/campaigns${mode === "edit" && campaign ? `/${campaign.id}` : ""}`, {
        method: mode === "edit" ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: formData.get("name"),
          channel: selectedChannel,
          audience: selectedAudience,
          budget: formData.get("budget"),
          status: formData.get("status"),
          startsAt: formData.get("startsAt"),
          endsAt: formData.get("endsAt"),
          offer: formData.get("offer"),
          imageUrl: imageUrl ?? campaign?.imageUrl ?? null,
          campaignType: selectedType,
          targetLocation: location || "All service areas",
        }),
      });
      if (response.ok) onSaved();
    } finally {
      setSaving(false);
      setProgress(null);
    }
  }

  return (
    <ModalShell title={mode === "add" ? "Create campaign" : "Edit campaign"} subtitle="Build the promo in four steps before publishing." onClose={onClose} wide>
      <form action={submit}>
      <div className="grid grid-cols-4 gap-2">
        {steps.map((label, index) => (
          <button type="button" key={label} onClick={() => setStep(index + 1)} className={`rounded-lg border px-3 py-2 text-left text-[10px] font-semibold ${step === index + 1 ? "border-[#FE9A00] bg-[#FFFBEB] text-[#101828]" : "border-gray-200 text-[#6A7282]"}`}>
            <span className="block text-[9px] text-[#99A1AF]">Step {index + 1}</span>{label}
          </button>
        ))}
      </div>

      <div className="mt-5">
          <div className={step === 1 ? "space-y-5" : "hidden"}>
            <div className="grid grid-cols-3 gap-3">
              {campaignTypes.map((type) => (
                <button type="button" key={type.name} onClick={() => setSelectedType(type.name)} className={`rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-sm ${type.style} ${selectedType === type.name ? "outline outline-2 outline-offset-2 outline-[#FE9A00]" : ""}`}>
                  <div className="text-2xl">{type.icon}</div><p className="mt-3 text-[11px] font-semibold text-[#101828]">{type.name}</p><p className="mt-1 text-[10px]">{type.subtext}</p>
                </button>
              ))}
            </div>
            <FileUploadField
              label="Campaign banner"
              name="bannerImage"
              currentUrl={bannerPreview}
              progress={progress}
              onPreviewChange={setBannerPreview}
            />
          </div>

          <div className={step === 2 ? "grid grid-cols-2 gap-4" : "hidden"}>
            <FormField name="name" label="Campaign name" defaultValue={campaign?.name ?? ""} placeholder="Fashina Lunch Push" />
            <FormField label="Discount type" placeholder="Fixed amount, percentage, free delivery" />
            <FormField name="offer" label="Description" defaultValue={campaign?.offer ?? ""} placeholder="Short campaign description" />
            <FormField name="budget" label="Total budget" type="number" defaultValue={campaign ? String(campaign.budget) : ""} placeholder="40000" />
            <div className="col-span-2">
              <p className="text-[10px] font-semibold text-[#6A7282]">Channels</p>
              <div className="mt-2 grid grid-cols-4 gap-3">
                {["In-app", "Social media", "WhatsApp", "Push"].map((channel) => <button type="button" key={channel} onClick={() => setSelectedChannel(channel)} className={`rounded-xl border p-3 text-[10px] font-semibold hover:border-[#FE9A00] ${selectedChannel === channel ? "border-[#FE9A00] bg-[#FFFBEB] text-[#101828]" : "border-gray-200 bg-white text-[#6A7282]"}`}>{channel}</button>)}
              </div>
            </div>
          </div>

          <div className={step === 3 ? "space-y-5" : "hidden"}>
            <div className="grid grid-cols-3 gap-3">
              {audienceTypes.map((audience) => <button type="button" key={audience} onClick={() => setSelectedAudience(audience)} className={`rounded-xl border p-3 text-left text-[10px] font-semibold ${selectedAudience === audience ? "border-[#FE9A00] bg-[#FFFBEB] text-[#101828]" : "border-gray-200 text-[#6A7282]"}`}>{audience}</button>)}
            </div>
            <FormField label="Target location" value={location} onChange={(event) => setLocation(event.currentTarget.value)} placeholder="Type service area" />
            <div className="flex flex-wrap gap-2">
              {locationSuggestions.filter((item) => item.toLowerCase().includes(location.toLowerCase()) || !location).map((item) => (
                <button type="button" key={item} onClick={() => setLocation(item)} className="flex items-center gap-2 rounded-full bg-gray-100 px-3 py-2 text-[10px] font-semibold text-[#6A7282]"><FaMapMarkerAlt />{item}</button>
              ))}
            </div>
          </div>

          <div className={step === 4 ? "grid grid-cols-2 gap-4" : "hidden"}>
            <FormField name="startsAt" label="Start date" type="date" defaultValue={campaign?.startsAt ?? ""} />
            <FormField name="endsAt" label="End date" type="date" defaultValue={campaign?.endsAt ?? ""} />
            <input type="hidden" name="status" value={campaign?.status ?? "scheduled"} />
            <div className="col-span-2 rounded-2xl bg-gray-50 p-4">
              <h3 className="text-xs font-semibold text-[#101828]">Summary</h3>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <MiniCard label="Campaign type" value={selectedType} />
                <MiniCard label="Audience" value={selectedAudience} />
                <MiniCard label="Location" value={location || "All service areas"} />
                <MiniCard label="Banner" value={bannerPreview ? "Uploaded" : "Not uploaded"} />
              </div>
            </div>
          </div>
      </div>

      <div className="mt-6 flex items-center justify-between border-t border-gray-100 pt-4">
        <button type="button" onClick={step === 1 ? onClose : () => setStep((current) => current - 1)} className="rounded-lg border border-gray-200 px-4 py-2 text-[11px] font-semibold text-[#6A7282]">{step === 1 ? "Cancel" : "Back"}</button>
        {step === 4 ? <Button type="submit">{saving ? "Saving..." : mode === "add" ? "Create campaign" : "Save campaign"}</Button> : <Button onClick={() => setStep((current) => current + 1)}>Continue</Button>}
      </div>
      </form>
    </ModalShell>
  );
}

function ModalShell({ title, subtitle, children, onClose, wide }: { title: string; subtitle: string; children: React.ReactNode; onClose: () => void; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 backdrop-blur-sm">
      <div className={`${wide ? "max-w-4xl" : "max-w-2xl"} max-h-[90vh] w-full overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl`}>
        <div className="flex items-start justify-between gap-4">
          <div><h2 className="text-sm font-semibold text-[#101828]">{title}</h2><p className="mt-1 text-[11px] text-[#6A7282]">{subtitle}</p></div>
          <button onClick={onClose} className="rounded-lg border border-gray-200 px-3 py-2 text-[10px] font-semibold text-[#6A7282]">Close</button>
        </div>
        <div className="mt-5">{children}</div>
      </div>
    </div>
  );
}
function Button({ children, icon, variant = "primary", onClick, type = "button", disabled }: { children: React.ReactNode; icon?: React.ReactNode; variant?: "primary" | "secondary" | "danger"; onClick?: () => void; type?: "button" | "submit"; disabled?: boolean }) {
  const style = variant === "primary" ? "bg-[#FE9A00] text-white" : variant === "danger" ? "border border-red-200 bg-red-50 text-red-600" : "border border-gray-200 bg-white text-[#6A7282]";
  return <button type={type} disabled={disabled} onClick={onClick} className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-[11px] font-semibold shadow-sm disabled:cursor-not-allowed disabled:opacity-60 ${style}`}>{icon}{children}</button>;
}
function MiniCard({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-gray-50 p-3"><p className="text-[10px] text-[#99A1AF]">{label}</p><p className="mt-2 text-xs font-semibold text-[#101828]">{value}</p></div>;
}

function getSelectedFile(formData: FormData, name: string) {
  const value = formData.get(name);
  if (!(value instanceof File) || value.size === 0) return null;
  return value;
}

async function uploadAdminImage(
  file: File | null,
  type: "promo_banner",
  onProgress?: (progress: UploadProgress) => void,
) {
  if (!file) return null;

  if (file.size > 4 * 1024 * 1024) {
    throw new Error("Images must be 4MB or smaller");
  }

  if (!file.type.startsWith("image/")) {
    throw new Error("Please choose an image file");
  }

  onProgress?.({ label: `Preparing ${file.name}`, percent: 20 });

  const signatureResponse = await fetch(`${API_BASE_URL}/uploads/signature`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type }),
  });

  if (!signatureResponse.ok) {
    throw new Error("Unable to prepare image upload");
  }

  const { upload } = (await signatureResponse.json()) as CloudinarySignatureResponse;
  const cloudinaryFormData = new FormData();
  cloudinaryFormData.append("file", file);
  cloudinaryFormData.append("api_key", upload.apiKey);
  cloudinaryFormData.append("timestamp", String(upload.timestamp));
  cloudinaryFormData.append("signature", upload.signature);
  cloudinaryFormData.append("folder", upload.folder);
  cloudinaryFormData.append("public_id", upload.publicId);

  onProgress?.({ label: `Uploading ${file.name}`, percent: 65 });

  const cloudinaryResponse = await fetch(upload.uploadUrl, {
    method: "POST",
    body: cloudinaryFormData,
  });

  if (!cloudinaryResponse.ok) {
    throw new Error("Unable to upload image");
  }

  const uploadedFile = (await cloudinaryResponse.json()) as CloudinaryUploadResponse;
  onProgress?.({ label: `${file.name} uploaded`, percent: 100 });

  return uploadedFile.secure_url;
}

function FileUploadField({
  label,
  name,
  currentUrl,
  progress,
  onPreviewChange,
}: {
  label: string;
  name: string;
  currentUrl: string | null;
  progress: UploadProgress | null;
  onPreviewChange: (url: string | null) => void;
}) {
  const [fileName, setFileName] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentUrl);

  useEffect(() => {
    setPreviewUrl(currentUrl);
  }, [currentUrl]);

  useEffect(() => {
    return () => {
      if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  return (
    <label className="block rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-4 text-center transition hover:border-[#FE9A00] hover:bg-[#FFFBEB]">
      <input
        type="file"
        name={name}
        accept="image/*"
        className="sr-only"
        onChange={(event) => {
          const file = event.currentTarget.files?.[0] ?? null;
          setFileName(file?.name ?? "");
          if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
          const nextPreviewUrl = file ? URL.createObjectURL(file) : currentUrl;
          setPreviewUrl(nextPreviewUrl);
          onPreviewChange(nextPreviewUrl);
        }}
      />
      {previewUrl ? (
        <img src={previewUrl} alt="" className="h-36 w-full rounded-2xl object-cover" />
      ) : (
        <div className="flex h-36 flex-col items-center justify-center">
          <FaImage className="text-[#FE9A00]" />
          <p className="mt-2 text-[11px] font-semibold text-[#101828]">Upload campaign banner</p>
          <p className="text-[10px] text-[#99A1AF]">Recommended: wide image for campaign cards</p>
        </div>
      )}
      {fileName ? <p className="mt-3 truncate text-[10px] font-semibold text-[#6A7282]">{fileName}</p> : null}
      {progress && fileName ? (
        <div className="mt-3">
          <div className="h-1.5 overflow-hidden rounded-full bg-white">
            <div className="h-full rounded-full bg-[#FE9A00] transition-all" style={{ width: `${progress.percent}%` }} />
          </div>
          <p className="mt-1 truncate text-[10px] font-semibold text-[#B7791F]">{progress.label}</p>
        </div>
      ) : null}
    </label>
  );
}

function FormField({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return <label className="block"><span className="text-[10px] font-semibold text-[#6A7282]">{label}</span><input {...props} className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-[11px] outline-none focus:border-[#FE9A00] focus:ring-2 focus:ring-[#FE9A00]/10" /></label>;
}
function StatusPill({ status }: { status: CampaignStatus }) {
  const styles = { active: "bg-[#DCFCE7] text-[#16A34A]", scheduled: "bg-[#EFF6FF] text-[#1D4ED8]", paused: "bg-[#FFF7E0] text-[#B7791F]", ended: "bg-gray-100 text-[#6A7282]" };
  return <p className={`rounded-lg px-2 py-1 text-center text-[10px] font-semibold capitalize ${styles[status]}`}>{status}</p>;
}
function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(amount);
}
function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-NG", { day: "2-digit", month: "short" }).format(new Date(value));
}
