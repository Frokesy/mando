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
          className="mx-2 rounded-2xl border border-[#E5E5E5] bg-white px-4 py-3 shadow-xl shadow-black/10 text-sm text-[#111827] ring-1 ring-black/5"
          style={{ animation: "slide-up 260ms ease-out" }}
        >
          {toast.message}
        </div>
      )),
    [toasts],
  );

  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
      <div className="flex max-w-[420px] flex-col items-center gap-3">
        {toastItems}
      </div>
    </div>
  );
};

export default ToastContainer;
