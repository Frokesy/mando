"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function ChangeAddressPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/customer/address?next=/customer/cart");
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F8F8F8] p-6 text-center">
      <div>
        <p className="text-sm font-semibold text-[#141B34]">Opening address manager...</p>
        <Link href="/customer/address?next=/customer/cart" className="mt-3 inline-flex text-sm font-semibold text-[#DFB400]">
          Continue
        </Link>
      </div>
    </div>
  );
}
