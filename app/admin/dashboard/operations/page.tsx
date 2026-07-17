"use client";

import { useEffect, useState } from "react";
import { FaEdit, FaMapMarkerAlt, FaMotorcycle, FaPlus, FaRoute, FaSave, FaTrash } from "react-icons/fa";
import StatsCard from "@/components/cards/StatsCard";
import { useToastStore } from "@/store/toastStore";

const API_BASE_URL =
  (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000").replace(/\/+$/, "");

type ServiceArea = {
  id: string;
  name: string;
  city: string;
  state: string;
  isActive?: boolean;
};

type RestaurantLocation = {
  id: string;
  name: string;
  streetAddress: string;
};

type DeliveryPricing = {
  baseFeeAmount: number;
  feePerKmAmount: number;
  minimumFeeAmount: number;
  freeDeliveryThresholdAmount?: number;
  serviceAreaOverrides: { serviceAreaId: string; deliveryFeeAmount: number }[];
};

type OperationsResponse = {
  pricing: DeliveryPricing;
  serviceAreas: ServiceArea[];
  restaurants: RestaurantLocation[];
};

const fallbackPricing: DeliveryPricing = {
  baseFeeAmount: 300,
  feePerKmAmount: 80,
  minimumFeeAmount: 400,
  freeDeliveryThresholdAmount: 0,
  serviceAreaOverrides: [],
};

export default function AdminOperationsPage() {
  const showToast = useToastStore((s) => s.showToast);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pricing, setPricing] = useState<DeliveryPricing>(fallbackPricing);
  const [serviceAreas, setServiceAreas] = useState<ServiceArea[]>([]);
  const [restaurants, setRestaurants] = useState<RestaurantLocation[]>([]);
  const [serviceAreaModal, setServiceAreaModal] = useState<ServiceArea | "new" | null>(null);
  const [areaPendingDelete, setAreaPendingDelete] = useState<ServiceArea | null>(null);
  const [deletingAreaId, setDeletingAreaId] = useState<string | null>(null);

  async function loadOperations() {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/admin/operations/delivery-pricing`, { credentials: "include" });
      if (!response.ok) throw new Error("Unable to load operations settings");
      const data = (await response.json()) as OperationsResponse;
      setPricing(data.pricing);
      setServiceAreas(data.serviceAreas);
      setRestaurants(data.restaurants);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Unable to load operations settings", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let mounted = true;

    fetch(`${API_BASE_URL}/admin/operations/delivery-pricing`, { credentials: "include" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load operations settings");
        return response.json() as Promise<OperationsResponse>;
      })
      .then((data) => {
        if (!mounted) return;
        setPricing(data.pricing);
        setServiceAreas(data.serviceAreas);
        setRestaurants(data.restaurants);
      })
      .catch((error) => showToast(error instanceof Error ? error.message : "Unable to load operations settings", "error"))
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [showToast]);

  function setOverride(serviceAreaId: string, deliveryFeeAmount: number) {
    setPricing((current) => {
      const existing = current.serviceAreaOverrides.filter((item) => item.serviceAreaId !== serviceAreaId);
      return {
        ...current,
        serviceAreaOverrides: [...existing, { serviceAreaId, deliveryFeeAmount }],
      };
    });
  }

  function getOverride(serviceAreaId: string) {
    return pricing.serviceAreaOverrides.find((item) => item.serviceAreaId === serviceAreaId)?.deliveryFeeAmount ?? pricing.minimumFeeAmount;
  }

  async function savePricing() {
    setSaving(true);
    try {
      const response = await fetch(`${API_BASE_URL}/admin/operations/delivery-pricing`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(pricing),
      });
      if (!response.ok) throw new Error("Unable to save delivery pricing");
      showToast("Delivery pricing saved", "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Unable to save delivery pricing", "error");
    } finally {
      setSaving(false);
    }
  }

  async function deleteServiceArea(serviceArea: ServiceArea) {
    setDeletingAreaId(serviceArea.id);
    try {
      const response = await fetch(`${API_BASE_URL}/admin/operations/service-areas/${serviceArea.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const payload = await response.json().catch(() => null) as { message?: string } | null;
      if (!response.ok) throw new Error(payload?.message ?? "Unable to delete service area");
      showToast("Service area deleted", "success");
      setAreaPendingDelete(null);
      await loadOperations();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Unable to delete service area", "error");
    } finally {
      setDeletingAreaId(null);
    }
  }

  const stats = [
    { id: 1, statTitle: "Service Areas", qty: String(serviceAreas.length), crease: "Active locations", theme: "bg-[#EFF6FF]", increase: true, icon: <FaMapMarkerAlt />, iconColor: "text-[#2563EB]" },
    { id: 2, statTitle: "Base Delivery", qty: formatCurrency(pricing.baseFeeAmount), crease: "Before distance", theme: "bg-[#FFFBEB]", increase: true, icon: <FaMotorcycle />, iconColor: "text-[#FE9A00]" },
    { id: 3, statTitle: "Per KM", qty: formatCurrency(pricing.feePerKmAmount), crease: "Distance pricing", theme: "bg-[#ECFDF5]", increase: true, icon: <FaRoute />, iconColor: "text-[#16A34A]" },
  ];

  return (
    <div className="pb-10 pr-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-[18px] font-semibold text-[#101828]">Operations</h2>
          <p className="text-[11px] text-[#99A1AF]">Control location coverage and delivery pricing by service area and distance.</p>
        </div>
        <button disabled={saving || loading} onClick={() => void savePricing()} className="flex items-center gap-2 rounded-lg bg-[#FE9A00] px-4 py-2 text-[11px] font-semibold text-white disabled:opacity-60">
          <FaSave />
          {saving ? "Saving..." : "Save settings"}
        </button>
      </div>

      <div className="mt-8 grid grid-cols-3 gap-3">
        {stats.map((item) => <StatsCard key={item.id} {...item} />)}
      </div>

      <section className="mt-8 grid grid-cols-[0.95fr_1.05fr] gap-5">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-[#101828]">Distance Pricing</h3>
          <p className="mt-1 text-[11px] text-[#99A1AF]">Use these values to compute delivery from restaurant location to customer location.</p>
          <div className="mt-5 grid gap-4">
            <NumberField label="Base fee" value={pricing.baseFeeAmount} onChange={(value) => setPricing((current) => ({ ...current, baseFeeAmount: value }))} />
            <NumberField label="Fee per KM" value={pricing.feePerKmAmount} onChange={(value) => setPricing((current) => ({ ...current, feePerKmAmount: value }))} />
            <NumberField label="Minimum delivery fee" value={pricing.minimumFeeAmount} onChange={(value) => setPricing((current) => ({ ...current, minimumFeeAmount: value }))} />
            <NumberField label="Free delivery threshold" value={pricing.freeDeliveryThresholdAmount ?? 0} onChange={(value) => setPricing((current) => ({ ...current, freeDeliveryThresholdAmount: value }))} />
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-[#101828]">Service Area Overrides</h3>
          <p className="mt-1 text-[11px] text-[#99A1AF]">Set fixed minimums for places like Fashina, Moremi Estate, and similar zones.</p>
          <div className="mt-5 grid gap-3">
            {serviceAreas.map((area) => (
              <div key={area.id} className="grid grid-cols-[1fr_150px] items-center gap-4 rounded-2xl bg-gray-50 p-4">
                <div>
                  <p className="text-sm font-semibold text-[#101828]">{area.name}</p>
                  <p className="text-[11px] text-[#99A1AF]">{area.city}, {area.state}</p>
                </div>
                <NumberField label="Fee" value={getOverride(area.id)} onChange={(value) => setOverride(area.id, value)} compact />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-5 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-[#101828]">Service Areas</h3>
            <p className="mt-1 text-[11px] text-[#99A1AF]">Create, edit, deactivate or delete customer delivery locations.</p>
          </div>
          <button onClick={() => setServiceAreaModal("new")} className="flex items-center gap-2 rounded-lg bg-[#FE9A00] px-4 py-2 text-[11px] font-semibold text-white">
            <FaPlus />
            Add service area
          </button>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-3">
          {serviceAreas.map((area) => (
            <div key={area.id} className="rounded-2xl bg-gray-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[#101828]">{area.name}</p>
                  <p className="mt-1 text-[11px] text-[#99A1AF]">{area.city}, {area.state}</p>
                </div>
                <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${area.isActive === false ? "bg-red-50 text-red-600" : "bg-green-50 text-green-700"}`}>
                  {area.isActive === false ? "Inactive" : "Active"}
                </span>
              </div>
              <div className="mt-4 flex gap-2">
                <button onClick={() => setServiceAreaModal(area)} className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-[10px] font-semibold text-[#6A7282]">
                  <FaEdit />
                  Edit
                </button>
                <button disabled={deletingAreaId === area.id} onClick={() => setAreaPendingDelete(area)} className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-[10px] font-semibold text-red-600 disabled:opacity-60">
                  <FaTrash />
                  {deletingAreaId === area.id ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-5 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-[#101828]">Restaurant Location Reference</h3>
        <p className="mt-1 text-[11px] text-[#99A1AF]">These addresses are used as the pickup side of future distance calculations.</p>
        <div className="mt-5 grid grid-cols-3 gap-3">
          {restaurants.map((restaurant) => (
            <div key={restaurant.id} className="rounded-2xl bg-gray-50 p-4">
              <p className="text-sm font-semibold text-[#101828]">{restaurant.name}</p>
              <p className="mt-2 text-[11px] leading-5 text-[#6A7282]">{restaurant.streetAddress}</p>
            </div>
          ))}
        </div>
      </section>
      {serviceAreaModal ? (
        <ServiceAreaModal
          serviceArea={serviceAreaModal === "new" ? null : serviceAreaModal}
          onClose={() => setServiceAreaModal(null)}
          onSaved={async () => {
            setServiceAreaModal(null);
            await loadOperations();
          }}
        />
      ) : null}
      {areaPendingDelete ? (
        <ConfirmationModal
          title="Delete service area"
          message={`Delete ${areaPendingDelete.name}? If this area is already used by orders, riders, restaurants or addresses, it will be protected.`}
          confirmLabel={deletingAreaId === areaPendingDelete.id ? "Deleting..." : "Delete"}
          danger
          disabled={deletingAreaId === areaPendingDelete.id}
          onCancel={() => setAreaPendingDelete(null)}
          onConfirm={() => void deleteServiceArea(areaPendingDelete)}
        />
      ) : null}
    </div>
  );
}

function ConfirmationModal({
  title,
  message,
  confirmLabel,
  danger,
  disabled,
  onCancel,
  onConfirm,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  danger?: boolean;
  disabled?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
        <h2 className="text-sm font-semibold text-[#101828]">{title}</h2>
        <p className="mt-2 text-[11px] leading-5 text-[#6A7282]">{message}</p>
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" disabled={disabled} onClick={onCancel} className="rounded-lg border border-gray-200 px-4 py-2 text-[11px] font-semibold text-[#6A7282] disabled:opacity-60">
            Cancel
          </button>
          <button type="button" disabled={disabled} onClick={onConfirm} className={`rounded-lg px-4 py-2 text-[11px] font-semibold text-white disabled:opacity-60 ${danger ? "bg-red-600" : "bg-[#FE9A00]"}`}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function NumberField({ label, value, onChange, compact }: { label: string; value: number; onChange: (value: number) => void; compact?: boolean }) {
  return (
    <label className="block">
      <span className="text-[10px] font-semibold text-[#6A7282]">{label}</span>
      <input
        type="number"
        value={value}
        onChange={(event) => onChange(Number(event.currentTarget.value) || 0)}
        className={`mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-[11px] outline-none focus:border-[#FE9A00] focus:ring-2 focus:ring-[#FE9A00]/10 ${compact ? "max-w-[150px]" : ""}`}
      />
    </label>
  );
}

function ServiceAreaModal({ serviceArea, onClose, onSaved }: { serviceArea: ServiceArea | null; onClose: () => void; onSaved: () => void }) {
  const showToast = useToastStore((s) => s.showToast);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: serviceArea?.name ?? "",
    city: serviceArea?.city ?? "",
    state: serviceArea?.state ?? "Lagos",
    isActive: serviceArea?.isActive !== false,
  });

  async function saveServiceArea() {
    if (!form.name.trim() || !form.city.trim() || !form.state.trim()) {
      showToast("Please complete the service area form", "error");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`${API_BASE_URL}/admin/operations/service-areas${serviceArea ? `/${serviceArea.id}` : ""}`, {
        method: serviceArea ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      });
      const payload = await response.json().catch(() => null) as { message?: string } | null;
      if (!response.ok) throw new Error(payload?.message ?? "Unable to save service area");
      showToast(serviceArea ? "Service area updated" : "Service area created", "success");
      onSaved();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Unable to save service area", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-[#101828]">{serviceArea ? "Edit service area" : "Add service area"}</h2>
            <p className="mt-1 text-[11px] text-[#6A7282]">Service areas appear on address, rider, vendor and delivery pricing screens.</p>
          </div>
          <button type="button" disabled={saving} onClick={onClose} className="rounded-lg border border-gray-200 px-3 py-2 text-[10px] font-semibold text-[#6A7282] disabled:opacity-60">Close</button>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-4">
          <TextField label="Area name" value={form.name} onChange={(value) => setForm((current) => ({ ...current, name: value }))} />
          <TextField label="City" value={form.city} onChange={(value) => setForm((current) => ({ ...current, city: value }))} />
          <TextField label="State" value={form.state} onChange={(value) => setForm((current) => ({ ...current, state: value }))} />
          <label className="flex items-center justify-between rounded-xl border border-gray-200 px-3 py-2.5 text-[11px] font-semibold text-[#6A7282]">
            Active
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(event) => setForm((current) => ({ ...current, isActive: event.currentTarget.checked }))}
              className="h-4 w-4 accent-[#FE9A00]"
            />
          </label>
        </div>

        <div className="mt-6 flex items-center justify-between border-t border-gray-100 pt-4">
          <button type="button" disabled={saving} onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 text-[11px] font-semibold text-[#6A7282] disabled:opacity-60">Cancel</button>
          <button type="button" disabled={saving} onClick={() => void saveServiceArea()} className="rounded-lg bg-[#FE9A00] px-4 py-2 text-[11px] font-semibold text-white disabled:opacity-60">
            {saving ? "Saving..." : "Save service area"}
          </button>
        </div>
      </div>
    </div>
  );
}

function TextField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="text-[10px] font-semibold text-[#6A7282]">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.currentTarget.value)}
        className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-[11px] outline-none focus:border-[#FE9A00] focus:ring-2 focus:ring-[#FE9A00]/10"
      />
    </label>
  );
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(amount);
}
