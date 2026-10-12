import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { leadScopeWhere } from "@/lib/scope";
import { Badge, PageHeader, Panel } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function RequirementsPage() {
  const user = await requireUser();
  const rows = await prisma.requirement.findMany({
    where: { lead: { isDeleted: false, ...leadScopeWhere(user) } },
    include: { lead: { include: { organization: true, product: true } } },
    orderBy: { receivedAt: "desc" },
    take: 100,
  });

  return (
    <div>
      <PageHeader title="Requirements" description="Captured business and technical needs." />
      <Panel>
        <ul className="divide-y divide-[var(--border)] text-sm">
          {rows.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
              <div>
                <Link href={`/leads/${r.leadId}`} className="font-medium hover:text-[var(--accent)]">
                  {r.lead.leadCode} · {r.lead.organization.orgName}
                </Link>
                <p className="text-xs text-[var(--muted)]">
                  {r.requirementType ?? "Requirement"}
                  {r.description ? ` · ${r.description}` : ""}
                </p>
              </div>
              <Badge>{r.status}</Badge>
            </li>
          ))}
          {rows.length === 0 ? (
            <li className="py-8 text-center text-[var(--muted)]">No requirements yet.</li>
          ) : null}
        </ul>
      </Panel>
    </div>
  );
}
