import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser, isManagerRole } from "@/lib/auth";
import { leadScopeWhere } from "@/lib/scope";
import { Badge, PageHeader, Panel } from "@/components/ui";
import { PHASES } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function PipelinePage() {
  const user = await requireUser();
  const manager = isManagerRole(user.role);

  const leads = await prisma.lead.findMany({
    where: { outcome: "Active", isDeleted: false, ...leadScopeWhere(user) },
    include: { organization: true, product: true, owner: true },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div>
      <PageHeader
        title="Pipeline board"
        description={
          manager
            ? "All active leads across the team, by phase."
            : "Only leads you currently own — other people's work stays on their board."
        }
      />

      <div className="flex gap-3 overflow-x-auto pb-4">
        {PHASES.map((phase) => {
          const column = leads.filter((l) => l.currentPhase === phase.id);
          return (
            <Panel
              key={phase.id}
              title={`${phase.short} · ${phase.name}`}
              className="min-w-[240px] max-w-[260px] shrink-0"
              action={
                <span className="text-xs text-[var(--muted)]">{column.length}</span>
              }
            >
              <div className="space-y-2">
                {column.length === 0 ? (
                  <p className="text-xs text-[var(--muted)]">Empty</p>
                ) : (
                  column.map((lead) => (
                    <Link
                      key={lead.id}
                      href={`/leads/${lead.id}`}
                      className="block rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 transition hover:border-[var(--accent)]"
                    >
                      <p className="text-sm font-medium leading-snug">
                        {lead.organization.orgName}
                      </p>
                      <p className="mt-1 text-[11px] text-[var(--muted)]">
                        {lead.leadCode} · {lead.product.code}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        <Badge tone="accent">{lead.phaseStatus}</Badge>
                        {manager && lead.owner ? (
                          <Badge>{lead.owner.name.split(" ")[0]}</Badge>
                        ) : null}
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </Panel>
          );
        })}
      </div>
    </div>
  );
}
