"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Badge, Panel } from "@/components/ui";
import { NEXT_PHASES } from "@/lib/constants";

export type LeadRow = {
  id: string;
  leadCode: string;
  company: string;
  contactName: string | null;
  outreachDate: string | null;
  outreachChannel: string | null;
  outreachOwner: string | null;
  outreachStatus: string | null;
  temperature: string | null;
  nextAction: string | null;
  nextPhase: string | null;
  productId: string;
  productName: string;
};

type ProductOption = { id: string; name: string; code: string };

function tempTone(temp: string | null) {
  if (temp === "Hot") return "danger" as const;
  if (temp === "Warm") return "warn" as const;
  if (temp === "Cold") return "info" as const;
  return "neutral" as const;
}

export function LeadsTable({
  leads,
  products,
}: {
  leads: LeadRow[];
  products: ProductOption[];
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [productId, setProductId] = useState("all");
  const [pending, startTransition] = useTransition();
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return leads.filter((lead) => {
      if (productId !== "all" && lead.productId !== productId) return false;
      if (!q) return true;
      const hay = [lead.leadCode, lead.company, lead.contactName ?? ""]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [leads, productId, search]);

  async function updateNextPhase(leadId: string, nextPhase: string) {
    setError(null);
    setSavingId(leadId);
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update", nextPhase }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update next phase");
      }
      startTransition(() => router.refresh());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <Panel>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search lead ID, company, contact…"
          className="min-w-[220px] flex-1 rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
        />
        <select
          value={productId}
          onChange={(e) => setProductId(e.target.value)}
          className="rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
        >
          <option value="all">All products</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.code})
            </option>
          ))}
        </select>
        {(pending || savingId) && (
          <span className="text-xs text-[var(--muted)]">Saving…</span>
        )}
      </div>
      {error ? (
        <p className="mb-3 text-sm text-rose-700">{error}</p>
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1100px] text-left text-sm">
          <thead className="border-b border-[var(--border)] text-[11px] uppercase tracking-wider text-[var(--muted)]">
            <tr>
              <th className="pb-2 pr-3 font-medium">Lead ID</th>
              <th className="pb-2 pr-3 font-medium">Company</th>
              <th className="pb-2 pr-3 font-medium">Contact Name</th>
              <th className="pb-2 pr-3 font-medium">Outreach Date</th>
              <th className="pb-2 pr-3 font-medium">Outreach Channel</th>
              <th className="pb-2 pr-3 font-medium">Outreach Owner</th>
              <th className="pb-2 pr-3 font-medium">Outreach Status</th>
              <th className="pb-2 pr-3 font-medium">Lead Temperature</th>
              <th className="pb-2 pr-3 font-medium">Next Action</th>
              <th className="pb-2 font-medium">Next Phase</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {filtered.map((lead) => (
              <tr key={lead.id} className="align-top">
                <td className="py-3 pr-3">
                  <Link
                    href={`/leads/${lead.id}`}
                    className="font-medium hover:text-[var(--accent)]"
                  >
                    {lead.leadCode}
                  </Link>
                </td>
                <td className="py-3 pr-3">
                  <Link
                    href={`/leads/${lead.id}`}
                    className="hover:text-[var(--accent)]"
                  >
                    {lead.company}
                  </Link>
                  <p className="text-xs text-[var(--muted)]">{lead.productName}</p>
                </td>
                <td className="py-3 pr-3">{lead.contactName ?? "—"}</td>
                <td className="py-3 pr-3 whitespace-nowrap">
                  {lead.outreachDate
                    ? format(new Date(lead.outreachDate), "dd MMM yyyy")
                    : "—"}
                </td>
                <td className="py-3 pr-3">{lead.outreachChannel ?? "—"}</td>
                <td className="py-3 pr-3">{lead.outreachOwner ?? "—"}</td>
                <td className="py-3 pr-3">{lead.outreachStatus ?? "—"}</td>
                <td className="py-3 pr-3">
                  {lead.temperature ? (
                    <Badge tone={tempTone(lead.temperature)}>
                      {lead.temperature}
                    </Badge>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="py-3 pr-3 text-[var(--muted)]">
                  {lead.nextAction ?? "—"}
                </td>
                <td className="py-3">
                  <select
                    value={lead.nextPhase ?? ""}
                    disabled={savingId === lead.id}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value) void updateNextPhase(lead.id, value);
                    }}
                    className="max-w-[140px] rounded-md border border-[var(--border)] bg-white px-2 py-1.5 text-sm outline-none focus:border-[var(--accent)] disabled:opacity-60"
                  >
                    <option value="">—</option>
                    {NEXT_PHASES.map((phase) => (
                      <option key={phase} value={phase}>
                        {phase}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-[var(--muted)]">
            {leads.length === 0
              ? "No leads yet. Start with New outreach."
              : "No leads match your search or filter."}
          </p>
        ) : null}
      </div>
    </Panel>
  );
}
