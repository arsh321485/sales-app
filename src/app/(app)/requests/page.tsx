import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { leadScopeWhere } from "@/lib/scope";
import { Badge, PageHeader, Panel } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function RequestsPage() {
  const user = await requireUser();
  const rows = await prisma.clientRequest.findMany({
    where: { lead: { isDeleted: false, ...leadScopeWhere(user) } },
    include: {
      lead: { include: { organization: true, product: true } },
      resource: true,
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div>
      <PageHeader
        title="Client requests"
        description="Proposal, pricing, presentation and other asks — mapped to SharePoint resources when configured."
      />
      <Panel>
        <ul className="divide-y divide-[var(--border)] text-sm">
          {rows.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
              <div>
                <Link href={`/leads/${r.leadId}`} className="font-medium hover:text-[var(--accent)]">
                  {r.lead.leadCode} · {r.title}
                </Link>
                <p className="text-xs text-[var(--muted)]">
                  {r.requestType}
                  {r.resource ? ` · ${r.resource.title}` : " · no resource map"}
                </p>
              </div>
              <Badge tone={r.status === "Sent" ? "ok" : "warn"}>{r.status}</Badge>
            </li>
          ))}
          {rows.length === 0 ? (
            <li className="py-8 text-center text-[var(--muted)]">No client requests yet.</li>
          ) : null}
        </ul>
      </Panel>
    </div>
  );
}
