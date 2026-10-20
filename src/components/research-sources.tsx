"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge, Panel } from "@/components/ui";

export type ResearchSourceItem = {
  id: string | null;
  name: string;
  category: string;
  fieldsSupplied: string | null;
  licence: string | null;
  allowedUses: string | null;
  personalData: boolean;
  refreshCadence: string | null;
  isActive: boolean;
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

export function ResearchSources({
  sources,
  isManager,
}: {
  sources: ResearchSourceItem[];
  isManager: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const isVirtual = sources.length > 0 && sources.every((s) => s.id === null);

  async function create(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setBusy(true);
    setError(null);
    const fd = new FormData(form);
    const payload = {
      ...Object.fromEntries(fd.entries()),
      personalData: fd.get("personalData") === "on",
    };
    const res = await fetch("/api/research/sources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data: { error?: string } = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Could not create source");
      return;
    }
    form.reset();
    router.refresh();
  }

  async function remove(source: ResearchSourceItem) {
    if (!source.id) return;
    if (!window.confirm(`Delete source “${source.name}”?`)) return;
    setDeletingId(source.id);
    setError(null);
    const res = await fetch(`/api/research/sources?id=${encodeURIComponent(source.id)}`, {
      method: "DELETE",
    });
    const data: { error?: string } = await res.json().catch(() => ({}));
    setDeletingId(null);
    if (!res.ok) {
      setError(data.error ?? "Could not delete source");
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {isVirtual ? (
        <p className="text-sm text-[var(--muted)]">
          Showing built-in default sources — no database sources have been added yet.
          {isManager ? " Adding your first source below will replace this list with your managed register." : ""}
        </p>
      ) : null}
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}

      {isManager ? (
        <Panel title="Add source">
          <form onSubmit={create} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <L label="Name *"><input name="name" required className={field} /></L>
            <L label="Category *">
              <select name="category" required className={field} defaultValue="Company">
                <option>Company</option><option>Contact</option><option>Other</option>
              </select>
            </L>
            <L label="Fields supplied"><input name="fieldsSupplied" className={field} placeholder="Legal name, address…" /></L>
            <L label="Licence"><input name="licence" className={field} placeholder="CC0 / Commercial / Public…" /></L>
            <L label="Refresh cadence"><input name="refreshCadence" className={field} placeholder="Daily / Weekly / Quarterly…" /></L>
            <L label="Allowed uses"><input name="allowedUses" className={field} /></L>
            <L label="Notes"><input name="notes" className={field} /></L>
            <label className="flex items-center gap-2 self-end pb-2 text-sm">
              <input type="checkbox" name="personalData" className="h-4 w-4" />
              Contains personal data
            </label>
            <div className="sm:col-span-2 lg:col-span-3">
              <button type="submit" disabled={busy} className={btn}>{busy ? "Saving…" : "Add source"}</button>
            </div>
          </form>
        </Panel>
      ) : null}

      <Panel title={`Sources (${sources.length})`}>
        {sources.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No sources registered yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-[11px] uppercase text-[var(--muted)]">
                <tr>
                  <th className="pb-2 pr-3">Name</th><th className="pb-2 pr-3">Category</th>
                  <th className="pb-2 pr-3">Fields</th><th className="pb-2 pr-3">Licence</th>
                  <th className="pb-2 pr-3">Refresh</th><th className="pb-2 pr-3">Personal data</th>
                  {isManager ? <th className="pb-2">Actions</th> : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {sources.map((s) => (
                  <tr key={s.id ?? s.name} className="align-top">
                    <td className="py-2 pr-3 font-medium">
                      {s.name}
                      {s.id === null ? <span className="ml-2"><Badge tone="info">Built-in default</Badge></span> : null}
                      {!s.isActive ? <span className="ml-2"><Badge tone="warn">Inactive</Badge></span> : null}
                    </td>
                    <td className="py-2 pr-3">{s.category}</td>
                    <td className="py-2 pr-3">{s.fieldsSupplied || "—"}</td>
                    <td className="py-2 pr-3">{s.licence || "—"}</td>
                    <td className="py-2 pr-3">{s.refreshCadence || "—"}</td>
                    <td className="py-2 pr-3">{s.personalData ? <Badge tone="warn">Yes</Badge> : <Badge>No</Badge>}</td>
                    {isManager ? (
                      <td className="py-2">
                        {s.id ? (
                          <button type="button" disabled={deletingId === s.id} onClick={() => remove(s)} className="rounded-md border border-rose-200 bg-white px-3 py-1.5 text-sm text-rose-700 disabled:opacity-60">
                            {deletingId === s.id ? "Deleting…" : "Delete"}
                          </button>
                        ) : <span className="text-xs text-[var(--muted)]">—</span>}
                      </td>
                    ) : null}
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
