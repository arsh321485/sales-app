"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Panel } from "@/components/ui";
import {
  NEXT_ACTIONS,
  NEXT_PHASES,
  OUTREACH_CHANNELS,
  OUTREACH_STATUSES,
  QUALIFICATION_STATUSES,
  RESPONSE_STATUSES,
  TEMPERATURES,
} from "@/lib/constants";

const field =
  "w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm";

export function NewLeadForm({
  products,
  assignableUsers,
  isManager,
  currentUserId,
}: {
  products: { id: string; name: string; code: string }[];
  assignableUsers: { id: string; name: string; role: string }[];
  isManager: boolean;
  currentUserId: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const payload = Object.fromEntries(fd.entries());
    const res = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Failed");
      setBusy(false);
      return;
    }
    router.push(`/leads/${data.id}`);
    router.refresh();
  }

  if (products.length === 0) {
    return (
      <Panel>
        <p className="text-sm text-[var(--muted)]">
          No products configured. Ask a Super Admin to add products under Settings
          before creating outreach.
        </p>
      </Panel>
    );
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <Panel title="New Outreach">
      <p className="mb-4 text-sm text-[var(--muted)]">
        Workflow: new outreach → Follow-up / Follow-up 1 / Follow-up 2 if no response →
        reply workflow when a response is received. You can also go straight to Meeting
        or Demo.
      </p>
      <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="text-sm">
          <span className="mb-1 block text-[var(--muted)]">Lead ID (optional)</span>
          <input name="leadCode" className={field} placeholder="Auto if blank (VF001…)" />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-[var(--muted)]">Product *</span>
          <select name="productId" required className={field} defaultValue="">
            <option value="" disabled>
              Select product
            </option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.code})
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-[var(--muted)]">Company</span>
          <input name="orgName" className={field} placeholder="Company / University" />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-[var(--muted)]">Contact Name</span>
          <input name="contactName" className={field} />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-[var(--muted)]">Designation</span>
          <input name="designation" className={field} />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-[var(--muted)]">Email</span>
          <input name="contactEmail" type="email" className={field} />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-[var(--muted)]">Phone</span>
          <input name="contactPhone" className={field} />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-[var(--muted)]">LinkedIn Profile</span>
          <input name="linkedinUrl" className={field} />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-[var(--muted)]">Website</span>
          <input name="websiteDomain" className={field} />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-[var(--muted)]">Industry</span>
          <input name="industry" className={field} />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-[var(--muted)]">Geography (Country / Region)</span>
          <input name="geography" className={field} placeholder="United States / North America" />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-[var(--muted)]">Location / Address</span>
          <input name="location" className={field} />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-[var(--muted)]">Outreach Date</span>
          <input name="outreachDate" type="date" className={field} defaultValue={today} />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-[var(--muted)]">Outreach Channel</span>
          <select name="outreachChannel" className={field} defaultValue="LinkedIn">
            {OUTREACH_CHANNELS.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-[var(--muted)]">Outreach Owner</span>
          <select
            name="ownerId"
            className={field}
            defaultValue={currentUserId}
            disabled={!isManager && assignableUsers.length === 0}
          >
            {(isManager ? assignableUsers : assignableUsers.filter((u) => u.id === currentUserId))
              .length === 0 ? (
              <option value={currentUserId}>Me</option>
            ) : null}
            {(isManager
              ? assignableUsers
              : [{ id: currentUserId, name: "Me", role: "SalesMember" }]
            ).map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
                {u.role ? ` (${u.role})` : ""}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-[var(--muted)]">Campaign / Email Type</span>
          <input name="campaign" className={field} />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-[var(--muted)]">Outreach Status</span>
          <select name="outreachStatus" className={field} defaultValue="Connected">
            {OUTREACH_STATUSES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-[var(--muted)]">Response Status</span>
          <select name="responseStatus" className={field} defaultValue="Awaiting">
            {RESPONSE_STATUSES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-[var(--muted)]">Last Reply Date</span>
          <input name="lastReplyDate" type="date" className={field} />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-[var(--muted)]">Qualification Status</span>
          <select name="qualification" className={field} defaultValue="Pending">
            {QUALIFICATION_STATUSES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-[var(--muted)]">Lead Temperature</span>
          <select name="temperature" className={field} defaultValue="">
            <option value="">—</option>
            {TEMPERATURES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-[var(--muted)]">Source</span>
          <input name="source" className={field} placeholder="LinkedIn / Referral / …" />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-[var(--muted)]">Pipeline Status</span>
          <input name="pipelineStatus" className={field} defaultValue="New" />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-[var(--muted)]">Next Action</span>
          <select name="nextAction" className={field} defaultValue="follow-up">
            {NEXT_ACTIONS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-[var(--muted)]">Next Action Date</span>
          <input name="nextActionDate" type="date" className={field} />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-[var(--muted)]">Next Phase</span>
          <select name="nextPhase" className={field} defaultValue="Follow-up 1">
            <option value="">—</option>
            {NEXT_PHASES.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </label>
        <label className="text-sm lg:col-span-3">
          <span className="mb-1 block text-[var(--muted)]">Notes / Conversation</span>
          <textarea name="notes" rows={3} className={field} />
        </label>
        {error ? (
          <p className="text-sm text-rose-700 lg:col-span-3">{error}</p>
        ) : null}
        <div className="lg:col-span-3">
          <button
            type="submit"
            disabled={busy}
            className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {busy ? "Saving…" : "Create outreach"}
          </button>
        </div>
      </form>
    </Panel>
  );
}
