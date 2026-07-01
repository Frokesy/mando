"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

export const SALES_AGENT_ATTRIBUTION_KEY = "mando.salesAgentId";
export const ONBOARDING_SEEN_KEY = "mando.onboardingSeen";

export default function SalesAttributionCapture() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const salesAgentId = searchParams.get("sa");

    if (salesAgentId) {
      window.localStorage.setItem(SALES_AGENT_ATTRIBUTION_KEY, salesAgentId);
      window.localStorage.setItem(ONBOARDING_SEEN_KEY, "true");
    }
  }, [searchParams]);

  return null;
}
