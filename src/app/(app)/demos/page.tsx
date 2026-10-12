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
    include: { lead: { include: { organization: true } } },
    orderBy: { scheduledAt: "desc" },
    take: 100,
  });

  return (
    <div>
      <PageHeader title="Demos" description="Product demos scheduled or completed." />
      <Panel>
        <ul className="divide-y divide-[var(--border)] text-sm">
          {rows.map((d) => (
            <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
              <div>
                <Link href={`/leads/${d.leadId}`} className="font-medium hover:text-[var(--accent)]">
                  {d.lead.organization.orgName}
                </Link>
                <p className="text-xs text-[var(--muted)]">
                  {d.scheduledAt ? format(d.scheduledAt, "dd MMM yyyy HH:mm") : "Unscheduled"}
                  {d.interestLevel ? ` · interest ${d.interestLevel}` : ""}
                </p>
              </div>
              <Badge>{d.status}</Badge>
            </li>
          ))}
          {rows.length === 0 ? (
            <li className="py-8 text-center text-[var(--muted)]">No demos yet.</li>
          ) : null}
        </ul>
      </Panel>
    </div>
  );
}
