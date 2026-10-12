import Link from "next/link";
import { format } from "date-fns";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { leadScopeWhere } from "@/lib/scope";
import { Badge, PageHeader, Panel } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function FollowUpsPage() {
  const user = await requireUser();
  const rows = await prisma.followUp.findMany({
    where: { lead: { isDeleted: false, ...leadScopeWhere(user) } },
    include: { lead: { include: { organization: true, product: true } } },
    orderBy: [{ status: "asc" }, { dueAt: "asc" }],
    take: 100,
  });

  return (
    <div>
      <PageHeader title="Follow-ups" description="Pending and completed follow-ups across your leads." />
      <Panel>
        <ul className="divide-y divide-[var(--border)] text-sm">
          {rows.map((f) => (
            <li key={f.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
              <div>
                <Link href={`/leads/${f.leadId}`} className="font-medium hover:text-[var(--accent)]">
                  {f.lead.leadCode} · {f.lead.organization.orgName}
                </Link>
                <p className="text-xs text-[var(--muted)]">
                  FU #{f.followUpNumber}
                  {f.dueAt ? ` · due ${format(f.dueAt, "dd MMM yyyy HH:mm")}` : ""}
                  {f.notes ? ` · ${f.notes}` : ""}
                </p>
              </div>
              <Badge tone={f.status === "Pending" ? "warn" : "ok"}>{f.status}</Badge>
            </li>
          ))}
          {rows.length === 0 ? (
            <li className="py-8 text-center text-[var(--muted)]">No follow-ups yet.</li>
          ) : null}
        </ul>
      </Panel>
    </div>
  );
}
