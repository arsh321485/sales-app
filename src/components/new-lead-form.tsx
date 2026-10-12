"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Panel } from "@/components/ui";

export function NewLeadForm({
  products,
  assignableUsers,
  isManager,
}: {
  products: { id: string; name: string; code: string }[];
  assignableUsers: { id: string; name: string; role: string }[];
  isManager: boolean;
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

  const field =
    "w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm";

  if (products.length === 0) {
    return (
      <Panel>
        <p className="text-sm text-[var(--muted)]">
          No products configured. Ask a Super Admin to add products under Settings before creating
          outreach.
        </p>
      </Panel>
    );
  }

  return (
    <Panel>
      <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm sm:col-span-2">
          <span className="mb-1 block text-[var(--muted)]">Company name *</span>
          <input name="orgName" required className={field} placeholder="Acme Manufacturing" />
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
          <span className="mb-1 block text-[var(--muted)]">Industry</span>
          <input name="industry" className={field} placeholder="Manufacturing" />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-[var(--muted)]">City</span>
          <input name="city" className={field} />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-[var(--muted)]">State</span>
          <input name="state" className={field} />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-[var(--muted)]">Website / domain</span>
          <input name="websiteDomain" className={field} placeholder="acme.com" />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-[var(--muted)]">Contact name *</span>
          <input name="contactName" required className={field} placeholder="Suresh Patil" />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-[var(--muted)]">Designation</span>
          <input name="designation" className={field} placeholder="CISO" />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-[var(--muted)]">Contact email</span>
          <input name="contactEmail" type="email" className={field} />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-[var(--muted)]">Contact phone</span>
          <input name="contactPhone" className={field} />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-[var(--muted)]">LinkedIn URL</span>
          <input name="linkedinUrl" className={field} />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-[var(--muted)]">Source</span>
          <input name="source" className={field} placeholder="LinkedIn / Referral / Website" />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-[var(--muted)]">Campaign</span>
          <input name="campaign" className={field} />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-[var(--muted)]">Outreach channel</span>
          <select name="outreachChannel" className={field} defaultValue="Manual">
            <option>Manual</option>
            <option>LinkedIn</option>
            <option>Email</option>
            <option>Call</option>
            <option>WhatsApp</option>
            <option>Event</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-[var(--muted)]">Next follow-up</span>
          <input name="nextFollowUpAt" type="datetime-local" className={field} />
        </label>
        <label className="text-sm sm:col-span-2">
          <span className="mb-1 block text-[var(--muted)]">Next action</span>
          <input name="nextAction" className={field} defaultValue="Qualify lead" />
        </label>
        <label className="text-sm sm:col-span-2">
          <span className="mb-1 block text-[var(--muted)]">Notes</span>
          <textarea name="notes" rows={2} className={field} />
        </label>
        {isManager && assignableUsers.length > 0 ? (
          <label className="text-sm sm:col-span-2">
            <span className="mb-1 block text-[var(--muted)]">Assign owner</span>
            <select name="ownerId" className={field} defaultValue="">
              <option value="">Me (default)</option>
              {assignableUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role})
                </option>
              ))}
            </select>
          </label>
        ) : null}
        {error ? (
          <p className="text-sm text-rose-700 sm:col-span-2">{error}</p>
        ) : null}
        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={busy}
            className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {busy ? "Saving…" : "Create outreach / lead"}
          </button>
        </div>
      </form>
    </Panel>
  );
}
