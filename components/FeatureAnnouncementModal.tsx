"use client";

import type { ReactNode } from "react";
import { useId } from "react";

type FeatureAnnouncementModalProps = {
  icon?: ReactNode;
  title: string;
  description: ReactNode;
  children?: ReactNode;
  dismissLabel?: string;
  onDismiss: () => void;
};

export default function FeatureAnnouncementModal({
  icon = "✨",
  title,
  description,
  children,
  dismissLabel = "Not now",
  onDismiss,
}: FeatureAnnouncementModalProps) {
  const titleId = useId();

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-5 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#FFF5C2] text-2xl">{icon}</div>
        <h2 id={titleId} className="mt-4 text-xl font-semibold text-[#141B34]">{title}</h2>
        <div className="mt-2 text-sm leading-6 text-[#6B6B6B]">{description}</div>
        {children ? <div className="mt-5 rounded-2xl bg-[#FAFAFA] p-4">{children}</div> : null}
        <button type="button" onClick={onDismiss} className="mt-4 w-full py-2 text-sm font-semibold text-[#6B6B6B]">
          {dismissLabel}
        </button>
      </div>
    </div>
  );
}
