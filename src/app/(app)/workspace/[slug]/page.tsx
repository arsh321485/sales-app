import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser, isManagerRole } from "@/lib/auth";
import { leadScopeWhere } from "@/lib/scope";
import { Badge, PageHeader, Panel } from "@/components/ui";

export const dynamic = "force-dynamic";

const WORKSPACES = {
  research: {
    title: "Research workspace",
    description: "Qualify leads, capture contacts, assign outreach owner.",
    phase: 1,
  },
  outreach: {
    title: "Outreach workspace",
    description: "Queue for pending outreach and follow-ups.",
    phases: [2, 3],
  },
  meetings: {
    title: "Meeting workspace",
    description: "Leads that agreed to meet — schedule and capture outcome.",
    phase: 4,
  },
  demos: {
    title: "Demo workspace",
    description: "Ready-for-demo queue after client confirmation.",
    phase: 7,
  },
} as const;

export default async function WorkspacePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const user = await requireUser();
  const manager = isManagerRole(user.role);
  const { slug } = await params;
  const meta = WORKSPACES[slug as keyof typeof WORKSPACES];
  if (!meta) {
    return (
      <div>
        <PageHeader title="Unknown workspace" />
        <p className="text-sm text-[var(--muted)]">
          Valid: research, outreach, meetings, demos.
        </p>
      </div>
    );
  }

  const phaseFilter =
    "phase" in meta
      ? { currentPhase: meta.phase }
      : { currentPhase: { in: [...meta.phases] } };

  const leads = await prisma.lead.findMany({
    where: {
      ...phaseFilter,
      outcome: "Active",
      isDeleted: false,
      ...leadScopeWhere(user),
    },
    include: { organization: true, product: true, owner: true },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div>
      <PageHeader
        title={meta.title}
        description={
          manager
            ? `${meta.description} Showing all owners.`
            : `${meta.description} Showing only your assigned leads.`
        }
      />
      <Panel>
        {leads.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">
            Your queue for this workspace is empty.
          </p>
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {leads.map((lead) => (
              <li
                key={lead.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3"
              >
                <div>
                  <Link
                    href={`/leads/${lead.id}`}
                    className="font-medium hover:text-[var(--accent)]"
                  >
                    {lead.organization.orgName}
                  </Link>
                  <p className="text-xs text-[var(--muted)]">
                    {lead.leadCode} · {lead.product.name}
                    {lead.owner ? ` · ${lead.owner.name}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone="accent">{lead.phaseStatus}</Badge>
                  {slug === "meetings" || slug === "demos" ? (
                    <Link
                      href="/calendar"
                      className="text-xs text-[var(--accent)] hover:underline"
                    >
                      Calendar
                    </Link>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
