"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import useCartStore from "@/store/cartStore";
import { useToastStore } from "@/store/toastStore";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

export default function PaymentProcessingPage() {
  const router = useRouter();
  const showToast = useToastStore((s) => s.showToast);
  const checkoutOrder = useCartStore((s) => s.checkoutOrder);
  const clearCart = useCartStore((s) => s.clear);
  const [queryOrderId, setQueryOrderId] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const orderId = queryOrderId ?? checkoutOrder?.id;
  const orderNumber = checkoutOrder?.orderNumber;

  useEffect(() => {
    setQueryOrderId(new URLSearchParams(window.location.search).get("orderId"));
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (!orderId) router.replace("/customer/cart/payment");
    }, 600);

    return () => window.clearTimeout(timeout);
  }, [orderId, router]);

  async function verifyPayment() {
    if (!orderId) return;

    setVerifying(true);

    try {
      const response = await fetch(`${API_BASE_URL}/customer/payments/checkout/${orderId}/verify`, {
        method: "POST",
        credentials: "include",
      });

      const body = (await response.json().catch(() => null)) as
        | {
            message?: string;
            order?: {
              id: string;
              orderNumber: string;
            };
          }
        | null;

      if (!response.ok) {
        throw new Error(body?.message ?? "Unable to verify payment");
      }

      clearCart();
      showToast("Payment verified. Your order has been sent to the restaurant.", "success");
      const params = new URLSearchParams({ orderId });
      const verifiedOrderNumber = body?.order?.orderNumber ?? orderNumber;

      if (verifiedOrderNumber) params.set("orderNumber", verifiedOrderNumber);

      router.replace(`/customer/cart/payment-success?${params.toString()}`);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Unable to verify payment", "error");
    } finally {
      setVerifying(false);
    }
  }

  return (
    <div className="p-6 min-h-screen flex flex-col justify-center items-center text-center">
      <div className="rounded-3xl bg-white p-6 shadow-lg border border-gray-200 max-w-md w-full">
        <h1 className="text-[24px] font-semibold mb-4">Payment confirmation pending</h1>
        <p className="text-[#6B6B6B] mb-2">
          We&apos;ve returned from checkout, but this order still needs payment
          verification before it can be sent to the restaurant.
        </p>
        {orderNumber && (
          <p className="mb-6 text-sm font-semibold text-[#141B34]">
            Order {orderNumber}
          </p>
        )}
        {!orderNumber && <div className="mb-6" />}
        <div className="h-2 w-full rounded-full bg-[#F3F3F3] overflow-hidden">
          <div className="h-full w-[80%] bg-[#DFB400] animate-pulse" />
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <Link
            href="/customer/orders"
            className="rounded-2xl bg-[#141B34] px-4 py-3 text-sm font-semibold text-white"
          >
            View order
          </Link>
          <button
            type="button"
            disabled={!orderId || verifying}
            className="rounded-2xl bg-[#DFB400] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
            onClick={() => void verifyPayment()}
          >
            {verifying ? "Verifying..." : "I have paid"}
          </button>
          <Link
            href="/customer/cart"
            className="rounded-2xl border border-[#141B34] px-4 py-3 text-sm font-semibold text-[#141B34]"
          >
            Back to cart
          </Link>
        </div>
      </div>
    </div>
  );
}
