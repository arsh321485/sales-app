import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { leadScopeWhere } from "@/lib/scope";
import { Badge, PageHeader, Panel } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function ClosurePage() {
  const user = await requireUser();
  const rows = await prisma.lead.findMany({
    where: {
      isDeleted: false,
      salesStage: { in: ["Won", "Lost"] },
      ...leadScopeWhere(user),
    },
    include: {
      contact: true,
    },
    orderBy: { closedAt: "desc" },
    take: 100,
  });

  return (
    <div>
      <PageHeader
        title="Closure"
        description="Leads closed as Won or Lost."
      />
      <Panel>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead className="border-b border-[var(--border)] text-[11px] uppercase tracking-wider text-[var(--muted)]">
              <tr>
                <th className="pb-2 pr-3 font-medium">Lead ID</th>
                <th className="pb-2 pr-3 font-medium">Contact Name</th>
                <th className="pb-2 font-medium">Final Outcome</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {rows.map((lead) => (
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
                    {lead.contact?.fullName ?? "—"}
                  </td>
                  <td className="py-3">
                    <Badge
                      tone={lead.salesStage === "Won" ? "ok" : "danger"}
                    >
                      {lead.salesStage}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-[var(--muted)]">
              No closed leads yet.
            </p>
          ) : null}
        </div>
      </Panel>
    </div>
  );
}
