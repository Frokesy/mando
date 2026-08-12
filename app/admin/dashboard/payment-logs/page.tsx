"use client";

import { useEffect, useState } from "react";

const API_BASE_URL =
  (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000").replace(/\/+$/, "");

type PaymentLog = {
  id: string;
  source: string;
  outcome: string;
  merchantReference: string | null;
  transactionReference: string | null;
  reportedStatus: string | null;
  verifiedStatus: string | null;
  requestId: string | null;
  providerCorrelationId: string | null;
  httpStatus: number | null;
  payload: unknown;
  verificationResponse: unknown;
  errorMessage: string | null;
  receivedAt: string;
  processedAt: string | null;
};

type LogsResponse = {
  events: PaymentLog[];
  outcomes: string[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
};

export default function AdminPaymentLogsPage() {
  const [data, setData] = useState<LogsResponse | null>(null);
  const [selected, setSelected] = useState<PaymentLog | null>(null);
  const [reference, setReference] = useState("");
  const [source, setSource] = useState("");
  const [outcome, setOutcome] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    const timeout = window.setTimeout(() => {
      const query = new URLSearchParams({ page: String(page), limit: "25" });
      if (reference.trim()) query.set("reference", reference.trim());
      if (source) query.set("source", source);
      if (outcome) query.set("outcome", outcome);

      setLoading(true);
      setError("");
      fetch(`${API_BASE_URL}/admin/payment-logs?${query.toString()}`, {
        credentials: "include",
        cache: "no-store",
      })
        .then(async (response) => {
          if (!response.ok) {
            const body = (await response.json().catch(() => null)) as { message?: string } | null;
            if (response.status === 404 && body?.message?.includes("Route GET:")) {
              throw new Error("The Payment Logs API is not deployed yet. Deploy or restart the updated API service, then refresh this page.");
            }
            throw new Error(body?.message ?? "Unable to load payment logs.");
          }
          return response.json() as Promise<LogsResponse>;
        })
        .then((result) => {
          if (mounted) setData(result);
        })
        .catch((reason: unknown) => {
          if (mounted) setError(reason instanceof Error ? reason.message : "Unable to load payment logs.");
        })
        .finally(() => {
          if (mounted) setLoading(false);
        });
    }, 250);

    return () => {
      mounted = false;
      window.clearTimeout(timeout);
    };
  }, [outcome, page, reference, source]);

  function changeFilter(action: () => void) {
    setPage(1);
    action();
  }

  return (
    <div className="pr-8 pb-12">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-[18px] font-semibold text-[#101828]">Payment logs</h2>
          <p className="mt-1 text-[11px] text-[#667085]">
            RoutePay webhooks and independent payment-verification results.
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-right">
          <p className="text-[10px] text-[#98A2B3]">Matching events</p>
          <p className="text-lg font-semibold text-[#101828]">{data?.pagination.total ?? 0}</p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-[1fr_180px_220px_auto] gap-3 rounded-xl border border-gray-100 bg-white p-4">
        <input
          value={reference}
          onChange={(event) => changeFilter(() => setReference(event.currentTarget.value))}
          placeholder="Transaction, merchant, or request ID"
          className="rounded-lg border border-gray-200 px-3 py-2 text-xs outline-none focus:border-[#FFB900]"
        />
        <select
          value={source}
          onChange={(event) => changeFilter(() => setSource(event.currentTarget.value))}
          className="rounded-lg border border-gray-200 px-3 py-2 text-xs outline-none"
        >
          <option value="">All sources</option>
          <option value="webhook">Webhook</option>
          <option value="manual_verification">Browser fallback</option>
        </select>
        <select
          value={outcome}
          onChange={(event) => changeFilter(() => setOutcome(event.currentTarget.value))}
          className="rounded-lg border border-gray-200 px-3 py-2 text-xs outline-none"
        >
          <option value="">All outcomes</option>
          {(data?.outcomes ?? []).map((value) => <option key={value} value={value}>{label(value)}</option>)}
        </select>
        <button
          type="button"
          onClick={() => { setReference(""); setSource(""); setOutcome(""); setPage(1); }}
          className="rounded-lg bg-[#101828] px-4 py-2 text-xs font-semibold text-white"
        >
          Clear
        </button>
      </div>

      {error && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-700">{error}</div>}

      <div className={`mt-5 grid gap-5 ${selected ? "grid-cols-[minmax(0,1fr)_380px]" : "grid-cols-1"}`}>
        <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
          <div className="grid grid-cols-[150px_120px_1fr_150px_110px_80px] gap-3 bg-gray-50 px-4 py-3 text-[10px] font-semibold uppercase text-[#98A2B3]">
            <span>Received</span><span>Source</span><span>Reference</span><span>Outcome</span><span>Status</span><span>Action</span>
          </div>
          {loading ? (
            <p className="p-8 text-center text-xs text-[#667085]">Loading payment events...</p>
          ) : !data?.events.length ? (
            <p className="p-8 text-center text-xs text-[#667085]">No payment events match these filters.</p>
          ) : data.events.map((event) => (
            <div key={event.id} className="grid grid-cols-[150px_120px_1fr_150px_110px_80px] items-center gap-3 border-t border-gray-100 px-4 py-3 text-[10px] text-[#475467]">
              <span>{formatDate(event.receivedAt)}</span>
              <span>{label(event.source)}</span>
              <span className="truncate font-mono" title={event.transactionReference ?? event.merchantReference ?? ""}>{event.transactionReference ?? event.merchantReference ?? "—"}</span>
              <span><OutcomeBadge outcome={event.outcome} /></span>
              <span>{event.verifiedStatus ?? event.reportedStatus ?? "—"}</span>
              <button type="button" onClick={() => setSelected(event)} className="font-semibold text-[#B77900] hover:underline">Inspect</button>
            </div>
          ))}
          <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3 text-[10px] text-[#667085]">
            <span>Page {data?.pagination.page ?? page} of {data?.pagination.totalPages ?? 1}</span>
            <div className="flex gap-2">
              <button type="button" disabled={page <= 1 || loading} onClick={() => setPage((value) => Math.max(1, value - 1))} className="rounded border border-gray-200 px-3 py-1.5 disabled:opacity-40">Previous</button>
              <button type="button" disabled={page >= (data?.pagination.totalPages ?? 1) || loading} onClick={() => setPage((value) => value + 1)} className="rounded border border-gray-200 px-3 py-1.5 disabled:opacity-40">Next</button>
            </div>
          </div>
        </div>

        {selected && <EventDetail event={selected} onClose={() => setSelected(null)} />}
      </div>
    </div>
  );
}

function EventDetail({ event, onClose }: { event: PaymentLog; onClose: () => void }) {
  return (
    <aside className="sticky top-5 h-fit max-h-[calc(100vh-40px)] overflow-auto rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[#101828]">Event details</h3>
        <button type="button" onClick={onClose} className="text-lg text-[#667085]">×</button>
      </div>
      <dl className="mt-5 space-y-3 text-[11px]">
        <Detail label="Received" value={formatDate(event.receivedAt)} />
        <Detail label="Outcome" value={label(event.outcome)} />
        <Detail label="Reported status" value={event.reportedStatus} />
        <Detail label="Verified status" value={event.verifiedStatus} />
        <Detail label="Transaction reference" value={event.transactionReference} mono />
        <Detail label="Merchant reference" value={event.merchantReference} mono />
        <Detail label="Mando request ID" value={event.requestId} mono />
        <Detail label="RoutePay correlation ID" value={event.providerCorrelationId} mono />
        <Detail label="Provider HTTP status" value={event.httpStatus?.toString() ?? null} />
        <Detail label="Error" value={event.errorMessage} />
      </dl>
      <JsonBlock title="Webhook payload" value={event.payload} />
      <JsonBlock title="RoutePay verification" value={event.verificationResponse} />
    </aside>
  );
}

function Detail({ label: title, value, mono = false }: { label: string; value: string | null; mono?: boolean }) {
  return <div><dt className="text-[#98A2B3]">{title}</dt><dd className={`mt-1 break-all text-[#344054] ${mono ? "font-mono" : "font-medium"}`}>{value || "—"}</dd></div>;
}

function JsonBlock({ title, value }: { title: string; value: unknown }) {
  if (value === null || value === undefined) return null;
  return <div className="mt-5"><p className="mb-2 text-[10px] font-semibold uppercase text-[#98A2B3]">{title}</p><pre className="max-h-64 overflow-auto rounded-lg bg-[#101828] p-3 text-[10px] leading-5 text-white">{JSON.stringify(value, null, 2)}</pre></div>;
}

function OutcomeBadge({ outcome }: { outcome: string }) {
  const risky = /failed|error|mismatch|unauthorized|invalid|missing|unmatched|unknown/.test(outcome);
  const successful = outcome === "provider_successful";
  return <span className={`inline-flex rounded-full px-2 py-1 font-semibold ${successful ? "bg-green-50 text-green-700" : risky ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}>{label(outcome)}</span>;
}

function label(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}
