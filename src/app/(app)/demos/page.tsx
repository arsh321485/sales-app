import Link from "next/link";
import { format } from "date-fns";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { leadScopeWhere } from "@/lib/scope";
import { Badge, PageHeader, Panel } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function DemosPage() {
  const user = await requireUser();
  const rows = await prisma.demo.findMany({
    where: { lead: { isDeleted: false, ...leadScopeWhere(user) } },
    include: {
      lead: {
        include: { organization: true, owner: true },
      },
    },
    orderBy: { scheduledAt: "desc" },
    take: 100,
  });

  return (
    <div>
      <PageHeader
        title="Demos"
        description="Product demos scheduled or completed."
      />
      <Panel>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-[var(--border)] text-[11px] uppercase tracking-wider text-[var(--muted)]">
              <tr>
                <th className="pb-2 pr-3 font-medium">Demo ID</th>
                <th className="pb-2 pr-3 font-medium">Company Name</th>
                <th className="pb-2 pr-3 font-medium">Demo Status</th>
                <th className="pb-2 pr-3 font-medium">Demo Date</th>
                <th className="pb-2 font-medium">Owner</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {rows.map((d) => (
                <tr key={d.id} className="align-top">
                  <td className="py-3 pr-3">
                    <Link
                      href={`/leads/${d.leadId}`}
                      className="font-medium hover:text-[var(--accent)]"
                    >
                      {d.demoCode ?? "—"}
                    </Link>
                  </td>
                  <td className="py-3 pr-3">{d.lead.organization.orgName}</td>
                  <td className="py-3 pr-3">
                    <Badge>{d.status}</Badge>
                  </td>
                  <td className="py-3 pr-3 whitespace-nowrap">
                    {d.scheduledAt
                      ? format(d.scheduledAt, "dd MMM yyyy HH:mm")
                      : "—"}
                  </td>
                  <td className="py-3">{d.lead.owner?.name ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-[var(--muted)]">
              No demos yet.
            </p>
          ) : null}
        </div>
      </Panel>
    </div>
  );
}
