"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

export const SALES_AGENT_ATTRIBUTION_KEY = "mando.salesAgentId";

export default function SalesAttributionCapture() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const salesAgentId = searchParams.get("sa");

    if (salesAgentId) {
      window.localStorage.setItem(SALES_AGENT_ATTRIBUTION_KEY, salesAgentId);
    }
  }, [searchParams]);

  return null;
}
