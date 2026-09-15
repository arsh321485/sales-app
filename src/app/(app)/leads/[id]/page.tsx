import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { prisma } from "@/lib/db";
import { Badge, PageHeader, Panel } from "@/components/ui";
import { phaseName } from "@/lib/constants";
import { requireUser, isManagerRole } from "@/lib/auth";
import { LeadActions } from "@/components/lead-actions";
import { LeadEditPanel } from "@/components/lead-edit-panel";
import type {
  DemoRow,
  DocumentRow,
  MeetingRow,
  PhaseHistoryRow,
  UserLite,
} from "@/types/models";

export const dynamic = "force-dynamic";

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const [lead, people] = await Promise.all([
    prisma.lead.findUnique({
      where: { id },
      include: {
        organization: true,
        product: true,
        owner: true,
        primaryContact: true,
        meetings: { orderBy: { scheduledAt: "desc" } },
        demos: { orderBy: { scheduledAt: "desc" } },
        documents: { where: { isDeleted: false }, orderBy: { uploadedAt: "desc" } },
        phaseHistory: { orderBy: { createdAt: "desc" }, include: { changedBy: true } },
        activities: { orderBy: { createdAt: "desc" }, take: 20 },
        outreachAttempts: { orderBy: { attemptedAt: "desc" }, take: 10 },
      },
    }),
    prisma.user.findMany({
      where: { isActive: true, role: { not: "Admin" } },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!lead) notFound();

  const involved =
    isManagerRole(user.role) ||
    lead.ownerId === user.id ||
    lead.meetings.some((m: MeetingRow) => m.ownerId === user.id) ||
    lead.demos.some(
      (d: DemoRow) => d.prepOwnerId === user.id || d.conductedById === user.id,
    );

  if (!involved) notFound();

  return (
    <div>
      <PageHeader
        title={lead.organization.orgName}
        description={`${lead.leadCode} · ${lead.product.name} · Phase ${lead.currentPhase} ${phaseName(lead.currentPhase)}`}
        actions={
          <div className="flex gap-2">
            <Link
              href="/calendar"
              className="rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm"
            >
              Calendar
            </Link>
            <Link
              href={`/documents?leadId=${lead.id}`}
              className="rounded-md bg-[var(--accent)] px-3 py-2 text-sm font-medium text-white"
            >
              Documents
            </Link>
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <Badge tone="accent">{lead.phaseStatus}</Badge>
        <Badge tone="info">{lead.outcome}</Badge>
        {lead.owner ? <Badge>Owner: {lead.owner.name}</Badge> : null}
        {lead.primaryContact ? (
          <Badge>
            Contact: {lead.primaryContact.fullName}
            {lead.primaryContact.designation
              ? ` (${lead.primaryContact.designation})`
              : ""}
          </Badge>
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Panel title="Lead 360">
          <dl className="grid gap-3 sm:grid-cols-2 text-sm">
            <div>
              <dt className="text-xs text-[var(--muted)]">Next action</dt>
              <dd>{lead.nextAction ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--muted)]">Next action date</dt>
              <dd>
                {lead.nextActionDate
                  ? format(lead.nextActionDate, "dd MMM yyyy")
                  : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--muted)]">ICP / trigger</dt>
              <dd>
                {lead.icpFit ?? "—"}
                {lead.triggerEvent ? ` · ${lead.triggerEvent}` : ""}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--muted)]">Furthest phase</dt>
              <dd>
                {lead.furthestPhaseReached} · {phaseName(lead.furthestPhaseReached)}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs text-[var(--muted)]">Organization</dt>
              <dd>
                {lead.organization.city}, {lead.organization.state} ·{" "}
                {lead.organization.industry} · {lead.organization.orgStatus}
              </dd>
            </div>
          </dl>
          </Panel>

          {lead.outcome === "Active" ? (
            <LeadActions
              leadId={lead.id}
              currentPhase={lead.currentPhase}
              people={people.map((p: UserLite) => ({ id: p.id, name: p.name, role: p.role }))}
            />
          ) : null}

          <LeadEditPanel
            leadId={lead.id}
            orgName={lead.organization.orgName}
            city={lead.organization.city}
            state={lead.organization.state}
            industry={lead.organization.industry}
            nextAction={lead.nextAction}
            nextActionDate={lead.nextActionDate?.toISOString() ?? null}
            icpFit={lead.icpFit}
            triggerEvent={lead.triggerEvent}
            people={people.map((p: UserLite) => ({
              id: p.id,
              name: p.name,
              role: p.role,
            }))}
            isManager={isManagerRole(user.role)}
            currentOwnerId={lead.ownerId}
          />
        </div>

        <Panel title="Timeline">
          <ul className="space-y-3">
            {lead.phaseHistory.map((h: PhaseHistoryRow) => (
              <li key={h.id} className="border-l-2 border-[var(--accent)] pl-3">
                <p className="text-sm font-medium">
                  {h.fromPhase != null ? `P${h.fromPhase} → ` : ""}P{h.toPhase}:{" "}
                  {h.toStatus}
                </p>
                <p className="text-xs text-[var(--muted)]">
                  {format(h.createdAt, "dd MMM · HH:mm")}
                  {h.changedBy ? ` · ${h.changedBy.name}` : ""}
                </p>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Meetings">
          {lead.meetings.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">No meetings yet.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {lead.meetings.map((m: MeetingRow) => (
                <li key={m.id} className="rounded-lg bg-[var(--surface)] px-3 py-2">
                  <p className="font-medium">{m.meetingCode}</p>
                  <p className="text-xs text-[var(--muted)]">
                    {m.scheduledAt
                      ? format(m.scheduledAt, "dd MMM yyyy · h:mm a")
                      : "Unscheduled"}{" "}
                    · {m.status}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Demos">
          {lead.demos.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">No demos yet.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {lead.demos.map((d: DemoRow) => (
                <li key={d.id} className="rounded-lg bg-[var(--surface)] px-3 py-2">
                  <p className="font-medium">{d.demoCode}</p>
                  <p className="text-xs text-[var(--muted)]">
                    {d.scheduledAt
                      ? format(d.scheduledAt, "dd MMM yyyy · h:mm a")
                      : "Unscheduled"}{" "}
                    · {d.status}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Documents on this lead">
          {lead.documents.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">No documents uploaded.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {lead.documents.map((d: DocumentRow) => (
                <li key={d.id}>
                  <Link
                    href={`/documents?preview=${d.id}`}
                    className="font-medium hover:text-[var(--accent)]"
                  >
                    {d.title}
                  </Link>
                  <p className="text-xs text-[var(--muted)]">
                    {d.documentType} · v{d.versionNo}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
