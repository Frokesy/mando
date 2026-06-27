"use client";

import { useMemo } from "react";
import useToastStore from "@/store/toastStore";

const ToastContainer = () => {
  const toasts = useToastStore((state) => state.toasts);

  const toastItems = useMemo(
    () =>
      toasts.map((toast) => (
        <div
          key={toast.id}
          className={`mx-2 w-full max-w-[440px] rounded-2xl border px-5 py-4 text-center text-base font-semibold shadow-2xl ring-1 ring-black/10 ${
            toast.type === "success"
              ? "border-[#D6B100] bg-[#141B34] text-white"
              : toast.type === "error"
                ? "border-[#B42318] bg-[#B42318] text-white"
                : "border-[#2563EB] bg-[#1D4ED8] text-white"
          }`}
          style={{ animation: "slide-down 260ms ease-out" }}
        >
          {toast.message}
        </div>
      )),
    [toasts],
  );

  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-5 z-50 flex justify-center px-4 sm:top-6">
      <div className="flex w-full max-w-[440px] flex-col items-center gap-3">
        {toastItems}
      </div>
    </div>
  );
};

export default ToastContainer;
