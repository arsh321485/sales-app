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
                {p.name}
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
          <span className="mb-1 block text-[var(--muted)]">Contact name *</span>
          <input name="contactName" required className={field} placeholder="Suresh Patil" />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-[var(--muted)]">Designation</span>
          <input name="contactDesignation" className={field} placeholder="CISO" />
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
          <span className="mb-1 block text-[var(--muted)]">Source</span>
          <input name="source" className={field} placeholder="LinkedIn / Referral / Website" />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-[var(--muted)]">ICP fit</span>
          <select name="icpFit" className={field} defaultValue="">
            <option value="">—</option>
            <option>High</option>
            <option>Medium</option>
            <option>Low</option>
          </select>
        </label>
        <label className="text-sm sm:col-span-2">
          <span className="mb-1 block text-[var(--muted)]">Trigger / why now</span>
          <input
            name="triggerEvent"
            className={field}
            placeholder="ISO 27001 audit due"
          />
        </label>
        <label className="text-sm sm:col-span-2">
          <span className="mb-1 block text-[var(--muted)]">Next action</span>
          <input
            name="nextAction"
            className={field}
            defaultValue="Verify contact and qualify"
          />
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
            {busy ? "Saving…" : "Create lead"}
          </button>
        </div>
      </form>
    </Panel>
  );
}
