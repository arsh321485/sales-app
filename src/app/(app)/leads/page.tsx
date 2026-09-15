import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser, isManagerRole } from "@/lib/auth";
import { leadScopeWhere } from "@/lib/scope";
import { Badge, PageHeader, Panel } from "@/components/ui";
import { healthTone, phaseName } from "@/lib/constants";
import type { LeadListItem } from "@/types/models";

export const dynamic = "force-dynamic";

export default async function LeadsPage() {
  const user = await requireUser();
  const manager = isManagerRole(user.role);

  const leads = await prisma.lead.findMany({
    where: { isDeleted: false, ...leadScopeWhere(user) },
    include: {
      organization: true,
      product: true,
      owner: true,
      primaryContact: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <PageHeader
        title={manager ? "All leads" : "My leads"}
        description={
          manager
            ? "Full team list. Use Dashboard to compare people."
            : "Leads assigned to you. Switch user from the sidebar to see another person's queue."
        }
      />

      <Panel>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-[var(--border)] text-[11px] uppercase tracking-wider text-[var(--muted)]">
              <tr>
                <th className="pb-2 pr-3 font-medium">Lead</th>
                <th className="pb-2 pr-3 font-medium">Product</th>
                <th className="pb-2 pr-3 font-medium">Phase</th>
                <th className="pb-2 pr-3 font-medium">Outcome</th>
                <th className="pb-2 pr-3 font-medium">Owner</th>
                <th className="pb-2 font-medium">Health</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {leads.map((lead: LeadListItem) => (
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
                      {lead.primaryContact
                        ? ` · ${lead.primaryContact.fullName}`
                        : ""}
                    </p>
                  </td>
                  <td className="py-3 pr-3">{lead.product.name}</td>
                  <td className="py-3 pr-3">
                    <div>{phaseName(lead.currentPhase)}</div>
                    <p className="text-xs text-[var(--muted)]">{lead.phaseStatus}</p>
                  </td>
                  <td className="py-3 pr-3">
                    <Badge
                      tone={
                        lead.outcome === "Won"
                          ? "ok"
                          : lead.outcome === "Dropped"
                            ? "danger"
                            : lead.outcome === "OnHold"
                              ? "warn"
                              : "info"
                      }
                    >
                      {lead.outcome}
                    </Badge>
                  </td>
                  <td className="py-3 pr-3">{lead.owner?.name ?? "—"}</td>
                  <td className="py-3">
                    <Badge tone={healthTone(lead.healthFlag) as "ok" | "warn" | "danger"}>
                      {lead.healthFlag}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {leads.length === 0 ? (
            <p className="py-8 text-center text-sm text-[var(--muted)]">
              No leads on your queue yet.
            </p>
          ) : null}
        </div>
      </Panel>
    </div>
  );
}
