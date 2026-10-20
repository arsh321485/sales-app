"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge, Panel } from "@/components/ui";

export type SuppressionItem = {
  id: string;
  email: string | null;
  nameDomainKey: string | null;
  reason: string;
  jurisdiction: string | null;
  createdAt: string;
};

export type PrivacyEventItem = {
  id: string;
  personEmail: string | null;
  eventType: string;
  status: string;
  receivedAt: string;
  completedAt: string | null;
  notes: string | null;
};

const field = "w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm";
const btn = "rounded-md bg-[var(--accent)] px-3 py-2 text-sm font-medium text-white disabled:opacity-60";

function L({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="text-sm">
      <span className="mb-1 block text-[var(--muted)]">{label}</span>
      {children}
    </label>
  );
}

function fmtDate(iso: string | null): string {
  return iso ? new Date(iso).toLocaleDateString("en-GB") : "—";
}

const SUPPRESSION_REASONS = ["Opt-out", "Erasure", "Registry flag", "Objection"] as const;
const EVENT_TYPES = ["Notice", "Objection", "Access", "Erasure", "Correction"] as const;

export function ResearchPrivacy({
  suppressions,
  privacyEvents,
}: {
  suppressions: SuppressionItem[];
  privacyEvents: PrivacyEventItem[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rowBusy, setRowBusy] = useState<string | null>(null);

  async function addSuppression(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setBusy(true);
    setError(null);
    const payload = Object.fromEntries(new FormData(form).entries());
    const res = await fetch("/api/research/suppression", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data: { error?: string } = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Could not add suppression");
      return;
    }
    form.reset();
    router.refresh();
  }

  async function deleteSuppression(item: SuppressionItem) {
    if (!window.confirm(`Remove suppression for ${item.email ?? item.nameDomainKey ?? item.id}?`)) return;
    setRowBusy(item.id);
    const res = await fetch(`/api/research/suppression?id=${encodeURIComponent(item.id)}`, { method: "DELETE" });
    const data: { error?: string } = await res.json().catch(() => ({}));
    setRowBusy(null);
    if (!res.ok) {
      setError(data.error ?? "Could not delete suppression");
      return;
    }
    router.refresh();
  }

  async function createEvent(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setBusy(true);
    setError(null);
    const payload = Object.fromEntries(new FormData(form).entries());
    const res = await fetch("/api/research/privacy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data: { error?: string } = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Could not create privacy event");
      return;
    }
    form.reset();
    router.refresh();
  }

  async function completeEvent(item: PrivacyEventItem) {
    setRowBusy(item.id);
    const res = await fetch("/api/research/privacy", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id }),
    });
    const data: { error?: string } = await res.json().catch(() => ({}));
    setRowBusy(null);
    if (!res.ok) {
      setError(data.error ?? "Could not complete event");
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}

      <Panel title="Add suppression">
        <p className="mb-3 text-sm text-[var(--muted)]">
          Suppressed emails are blocked when adding or converting research contacts.
          Erasure / Objection privacy events also create a suppression automatically.
        </p>
        <form onSubmit={addSuppression} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <L label="Email *"><input name="email" type="email" required className={field} /></L>
          <L label="Reason">
            <select name="reason" className={field} defaultValue="Opt-out">
              {SUPPRESSION_REASONS.map((r) => <option key={r}>{r}</option>)}
            </select>
          </L>
          <L label="Jurisdiction"><input name="jurisdiction" className={field} placeholder="e.g. GDPR / DPDP" /></L>
          <div className="self-end">
            <button type="submit" disabled={busy} className={btn}>{busy ? "Saving…" : "Add suppression"}</button>
          </div>
        </form>
      </Panel>

      <Panel title={`Suppression list (${suppressions.length})`}>
        {suppressions.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No suppressions recorded.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-[11px] uppercase text-[var(--muted)]">
                <tr><th className="pb-2 pr-3">Email / key</th><th className="pb-2 pr-3">Reason</th><th className="pb-2 pr-3">Jurisdiction</th><th className="pb-2 pr-3">Added</th><th className="pb-2">Actions</th></tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {suppressions.map((s) => (
                  <tr key={s.id}>
                    <td className="py-2 pr-3">{s.email || s.nameDomainKey || "—"}</td>
                    <td className="py-2 pr-3">{s.reason}</td>
                    <td className="py-2 pr-3">{s.jurisdiction || "—"}</td>
                    <td className="py-2 pr-3">{fmtDate(s.createdAt)}</td>
                    <td className="py-2">
                      <button type="button" disabled={rowBusy === s.id} onClick={() => deleteSuppression(s)} className="rounded-md border border-rose-200 bg-white px-3 py-1.5 text-sm text-rose-700 disabled:opacity-60">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel title="Record privacy event">
        <form onSubmit={createEvent} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <L label="Event type">
            <select name="eventType" className={field} defaultValue="Notice">
              {EVENT_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </L>
          <L label="Person email"><input name="personEmail" type="email" className={field} /></L>
          <L label="Jurisdiction"><input name="jurisdiction" className={field} placeholder="e.g. GDPR / DPDP" /></L>
          <L label="Notes"><input name="notes" className={field} /></L>
          <div className="sm:col-span-2 lg:col-span-4">
            <button type="submit" disabled={busy} className={btn}>{busy ? "Saving…" : "Record event"}</button>
          </div>
        </form>
      </Panel>

      <Panel title={`Privacy events (${privacyEvents.length})`}>
        {privacyEvents.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No privacy events recorded.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-[11px] uppercase text-[var(--muted)]">
                <tr><th className="pb-2 pr-3">Type</th><th className="pb-2 pr-3">Person email</th><th className="pb-2 pr-3">Status</th><th className="pb-2 pr-3">Received</th><th className="pb-2 pr-3">Notes</th><th className="pb-2">Actions</th></tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {privacyEvents.map((ev) => (
                  <tr key={ev.id} className="align-top">
                    <td className="py-2 pr-3">{ev.eventType}</td>
                    <td className="py-2 pr-3">{ev.personEmail || "—"}</td>
                    <td className="py-2 pr-3"><Badge tone={ev.status === "Completed" ? "ok" : "warn"}>{ev.status}</Badge></td>
                    <td className="whitespace-nowrap py-2 pr-3">{fmtDate(ev.receivedAt)}</td>
                    <td className="py-2 pr-3">{ev.notes || "—"}</td>
                    <td className="py-2">
                      {ev.status !== "Completed" ? (
                        <button type="button" disabled={rowBusy === ev.id} onClick={() => completeEvent(ev)} className={btn}>
                          {rowBusy === ev.id ? "Saving…" : "Complete"}
                        </button>
                      ) : <span className="text-xs text-[var(--muted)]">{fmtDate(ev.completedAt)}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
