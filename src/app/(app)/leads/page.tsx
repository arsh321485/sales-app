import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser, isManagerRole } from "@/lib/auth";
import { leadScopeWhere } from "@/lib/scope";
import { Badge, PageHeader, Panel } from "@/components/ui";

export const dynamic = "force-dynamic";

function stageTone(stage: string) {
  if (stage === "Won") return "ok" as const;
  if (stage === "Lost") return "danger" as const;
  if (stage === "OnHold") return "warn" as const;
  if (stage === "Negotiation" || stage === "Opportunity") return "accent" as const;
  return "info" as const;
}

export default async function LeadsPage() {
  const user = await requireUser();
  const manager = isManagerRole(user.role);

  const leads = await prisma.lead.findMany({
    where: { isDeleted: false, ...leadScopeWhere(user) },
    include: {
      organization: true,
      product: true,
      owner: true,
      contact: true,
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div>
      <PageHeader
        title={manager ? "All leads" : "My leads"}
        description="Flexible activity-based pipeline — stages move with real work, not forced gates."
        actions={
          <Link
            href="/leads/new"
            className="rounded-md bg-[var(--accent)] px-3 py-2 text-sm font-medium text-white"
          >
            New outreach
          </Link>
        }
      />

      <Panel>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="border-b border-[var(--border)] text-[11px] uppercase tracking-wider text-[var(--muted)]">
              <tr>
                <th className="pb-2 pr-3 font-medium">Lead</th>
                <th className="pb-2 pr-3 font-medium">Product</th>
                <th className="pb-2 pr-3 font-medium">Stage</th>
                <th className="pb-2 pr-3 font-medium">Temp</th>
                <th className="pb-2 pr-3 font-medium">Owner</th>
                <th className="pb-2 font-medium">Next action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {leads.map((lead) => (
                <tr key={lead.id} className="align-top">
                  <td className="py-3 pr-3">
                    <Link
                      href={`/leads/${lead.id}`}
                      className="font-medium hover:text-[var(--accent)]"
                    >
                      {lead.organization.orgName}
                    </Link>
                    <p className="text-xs text-[var(--muted)]">
                      {lead.leadCode}
                      {lead.contact ? ` · ${lead.contact.fullName}` : ""}
                    </p>
                  </td>
                  <td className="py-3 pr-3">{lead.product.name}</td>
                  <td className="py-3 pr-3">
                    <Badge tone={stageTone(lead.salesStage)}>{lead.salesStage}</Badge>
                  </td>
                  <td className="py-3 pr-3">{lead.temperature ?? "—"}</td>
                  <td className="py-3 pr-3">{lead.owner?.name ?? "—"}</td>
                  <td className="py-3 text-[var(--muted)]">{lead.nextAction ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {leads.length === 0 ? (
            <p className="py-8 text-center text-sm text-[var(--muted)]">
              No leads yet. Start with New outreach.
            </p>
          ) : null}
        </div>
      </Panel>
    </div>
  );
}
