"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ONBOARDING_SEEN_KEY } from "@/components/SalesAttributionCapture";
import Onboarding from "./onboarding/page";

const Home = () => {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (window.localStorage.getItem(ONBOARDING_SEEN_KEY) === "true") {
      router.replace("/customer/dashboard");
      return;
    }

    window.localStorage.setItem(ONBOARDING_SEEN_KEY, "true");
    setChecking(false);
  }, [router]);

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white px-6 text-sm font-semibold text-[#6B6B6B]">
        Loading...
      </div>
    );
  }

  return (
    <div className="">
      <Onboarding />
    </div>
  );
};

export default Home;
