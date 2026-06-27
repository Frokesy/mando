"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeftIcon } from "@/components/svgs/DefaultIcons";
import { useToastStore } from "@/store/toastStore";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

type ServiceArea = {
  id: string;
  name: string;
  city: string;
  state: string;
};

export default function AddressPage() {
  const router = useRouter();
  const showToast = useToastStore((s) => s.showToast);
  const [serviceAreas, setServiceAreas] = useState<ServiceArea[]>([]);
  const [selectedServiceAreaId, setSelectedServiceAreaId] = useState("");
  const [street, setStreet] = useState("");
  const [loadingAreas, setLoadingAreas] = useState(true);
  const [saving, setSaving] = useState(false);

  const selectedServiceArea = serviceAreas.find((area) => area.id === selectedServiceAreaId);

  useEffect(() => {
    let mounted = true;

    fetch(`${API_BASE_URL}/customer/service-areas`)
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load delivery locations");

        return response.json() as Promise<{ serviceAreas: ServiceArea[] }>;
      })
      .then((data) => {
        if (!mounted) return;

        setServiceAreas(data.serviceAreas);
        setSelectedServiceAreaId(data.serviceAreas[0]?.id ?? "");
      })
      .catch((error) => {
        if (!mounted) return;

        showToast(error instanceof Error ? error.message : "Unable to load delivery locations", "error");
      })
      .finally(() => {
        if (!mounted) return;

        setLoadingAreas(false);
      });

    return () => {
      mounted = false;
    };
  }, [showToast]);

  function clear() {
    setSelectedServiceAreaId(serviceAreas[0]?.id ?? "");
    setStreet("");
  }

  async function save() {
    if (!selectedServiceAreaId) {
      showToast("Please choose a delivery location", "error");
      return;
    }

    if (!street.trim()) {
      showToast("Please enter your street address", "error");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(`${API_BASE_URL}/customer/addresses`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          serviceAreaId: selectedServiceAreaId,
          label: "Home",
          streetAddress: street.trim(),
          isDefault: true,
        }),
      });

      if (response.status === 401) {
        showToast("Please log in to save an address", "error");
        router.push("/login");
        return;
      }

      if (!response.ok) {
        const errorBody = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(errorBody?.message ?? "Unable to save address");
      }

      showToast("Address saved successfully", "success");
      router.push("/customer/dashboard");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Unable to save address", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6 pb-28">
      <header className="flex items-center mb-6">
        <Link href="/customer/dashboard" className="flex items-center space-x-3">
          <ArrowLeftIcon />
          <span className="text-[24px] font-semibold">Address</span>
        </Link>
      </header>

      <section className="mb-8">
        <h3 className="text-sm text-[#A4A4A4] mb-3">Select your location</h3>
        <div className="flex flex-wrap gap-3">
          {loadingAreas ? (
            <p className="text-sm text-[#A4A4A4]">Loading delivery locations...</p>
          ) : null}
          {!loadingAreas && serviceAreas.length === 0 ? (
            <p className="text-sm text-[#A4A4A4]">No delivery locations available yet.</p>
          ) : null}
          {serviceAreas.map((area) => {
            const active = selectedServiceAreaId === area.id;
            return (
              <button
                key={area.id}
                onClick={() => setSelectedServiceAreaId(area.id)}
                className={`px-4 py-2 rounded-md border ${
                  active ? "border-[#DFB400] bg-[#FFF7E0] text-[#000]" : "border-gray-300 text-[#6B6B6B]"
                }`}
              >
                {area.name}
              </button>
            );
          })}
        </div>
      </section>

      <section className="mb-8">
        <h3 className="text-sm text-[#A4A4A4] mb-3">Enter your street address</h3>
        <div className="border border-gray-200 rounded-md p-4 relative">
          <input
            value={street}
            onChange={(e) => setStreet(e.target.value)}
            placeholder={selectedServiceArea ? `e.g. 12 ${selectedServiceArea.name} street` : "Select a location first"}
            className="w-full focus:outline-none text-[14px]"
          />
        </div>
          <div className="text-sm text-[#A4A4A4] flex justify-end mt-3">Can&apos;t find your location?</div>
      </section>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 flex gap-3">
        <button onClick={clear} className="flex-1 py-3 rounded-md border border-gray-300 text-gray-600">
          Clear
        </button>
        <button disabled={saving} onClick={save} className="flex-1 py-3 rounded-md bg-[#DFB400] text-black font-semibold disabled:opacity-60">
          {saving ? "Saving..." : "Save address"}
        </button>
      </div>
    </div>
  );
}
