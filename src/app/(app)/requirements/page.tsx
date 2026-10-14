import Link from "next/link";
import { format } from "date-fns";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { leadScopeWhere } from "@/lib/scope";
import { PageHeader, Panel } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function RequirementsPage() {
  const user = await requireUser();
  const rows = await prisma.requirement.findMany({
    where: { lead: { isDeleted: false, ...leadScopeWhere(user) } },
    include: {
      lead: {
        include: {
          organization: true,
          contact: true,
          owner: true,
        },
      },
    },
    orderBy: { receivedAt: "desc" },
    take: 100,
  });

  return (
    <div>
      <PageHeader
        title="Requirements"
        description="Captured business and technical needs."
      />
      <Panel>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="border-b border-[var(--border)] text-[11px] uppercase tracking-wider text-[var(--muted)]">
              <tr>
                <th className="pb-2 pr-3 font-medium">Lead ID</th>
                <th className="pb-2 pr-3 font-medium">Company</th>
                <th className="pb-2 pr-3 font-medium">Contact Name</th>
                <th className="pb-2 pr-3 font-medium">Outreach Owner</th>
                <th className="pb-2 pr-3 font-medium">Requirement Date</th>
                <th className="pb-2 font-medium">Requirement Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {rows.map((r) => (
                <tr key={r.id} className="align-top">
                  <td className="py-3 pr-3">
                    <Link
                      href={`/leads/${r.leadId}`}
                      className="font-medium hover:text-[var(--accent)]"
                    >
                      {r.lead.leadCode}
                    </Link>
                  </td>
                  <td className="py-3 pr-3">{r.lead.organization.orgName}</td>
                  <td className="py-3 pr-3">
                    {r.lead.contact?.fullName ?? "—"}
                  </td>
                  <td className="py-3 pr-3">{r.lead.owner?.name ?? "—"}</td>
                  <td className="py-3 pr-3 whitespace-nowrap">
                    {format(r.receivedAt, "dd MMM yyyy")}
                  </td>
                  <td className="py-3 text-[var(--muted)]">
                    {r.description ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-[var(--muted)]">
              No requirements yet.
            </p>
          ) : null}
        </div>
      </Panel>
    </div>
  );
}
