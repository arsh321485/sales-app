import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { leadScopeWhere } from "@/lib/scope";
import { Badge, PageHeader, Panel } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function OpportunitiesPage() {
  const user = await requireUser();
  const rows = await prisma.opportunity.findMany({
    where: { lead: { isDeleted: false, ...leadScopeWhere(user) } },
    include: {
      lead: { include: { organization: true, product: true } },
      owner: true,
    },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });

  return (
    <div>
      <PageHeader
        title="Opportunities"
        description="Valued deals in Opportunity / Negotiation — close from the lead page."
      />
      <Panel>
        <ul className="divide-y divide-[var(--border)] text-sm">
          {rows.map((o) => (
            <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
              <div>
                <Link href={`/leads/${o.leadId}`} className="font-medium hover:text-[var(--accent)]">
                  {o.lead.leadCode} · {o.lead.organization.orgName}
                </Link>
                <p className="text-xs text-[var(--muted)]">
                  {o.opportunityValue != null ? `₹${o.opportunityValue}` : "No value"}
                  {o.probability != null ? ` · ${o.probability}%` : ""}
                  {o.owner ? ` · ${o.owner.name}` : ""}
                </p>
              </div>
              <Badge tone="accent">{o.salesStage}</Badge>
            </li>
          ))}
          {rows.length === 0 ? (
            <li className="py-8 text-center text-[var(--muted)]">No opportunities yet.</li>
          ) : null}
        </ul>
      </Panel>
    </div>
  );
}
