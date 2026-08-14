"use client";

import { FormEvent, useState } from "react";

type ExistingAccount = {
  bankName?: string;
  accountName: string;
  accountNumberLast4: string;
} | null;

export default function PayoutAccountModal({
  open,
  endpoint,
  account,
  onClose,
  onSaved,
}: {
  open: boolean;
  endpoint: string;
  account: ExistingAccount;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  if (!open) return null;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch(endpoint, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bankName: form.get("bankName"),
          accountName: form.get("accountName"),
          accountNumber: form.get("accountNumber"),
        }),
      });
      const body = (await response.json().catch(() => null)) as { message?: string } | null;
      if (!response.ok) throw new Error(body?.message ?? "Unable to save payout account");
      await onSaved();
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save payout account");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 px-4">
      <form onSubmit={submit} className="w-full max-w-[430px] rounded-3xl bg-white p-6 shadow-2xl">
        <h2 className="text-xl font-semibold text-[#141B34]">Payout bank account</h2>
        <p className="mt-2 text-sm leading-6 text-[#6B6B6B]">Mando admin will use these details when manually processing an approved payout request.</p>
        {account ? <p className="mt-3 rounded-2xl bg-[#F7F4E3] p-3 text-sm text-[#6B6B6B]">Current: {account.bankName ? `${account.bankName} · ` : ""}{account.accountName} · ****{account.accountNumberLast4}</p> : null}
        <div className="mt-5 space-y-4">
          <Field name="bankName" label="Bank name" defaultValue={account?.bankName ?? ""} placeholder="Access Bank" />
          <Field name="accountName" label="Account name" defaultValue={account?.accountName ?? ""} placeholder="Name on the account" />
          <Field name="accountNumber" label="10-digit account number" inputMode="numeric" pattern="[0-9]{10}" maxLength={10} placeholder="0123456789" />
        </div>
        {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
        <div className="mt-6 flex gap-3">
          <button type="button" onClick={onClose} disabled={saving} className="flex-1 rounded-2xl border border-gray-300 py-3 text-sm font-semibold text-[#141B34]">Cancel</button>
          <button type="submit" disabled={saving} className="flex-1 rounded-2xl bg-[#141B34] py-3 text-sm font-semibold text-white disabled:opacity-60">{saving ? "Saving..." : "Save account"}</button>
        </div>
      </form>
    </div>
  );
}

function Field(props: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const { label, ...inputProps } = props;
  return <label className="block"><span className="text-sm font-semibold text-[#141B34]">{label}</span><input {...inputProps} required className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-[#FE9A00]" /></label>;
}
