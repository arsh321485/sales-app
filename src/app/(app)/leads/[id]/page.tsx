import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser, isManagerRole } from "@/lib/auth";
import { canViewAllLeads } from "@/lib/constants";
import { Badge, PageHeader, Panel } from "@/components/ui";
import { LeadWorkspace } from "@/components/lead-workspace";

export const dynamic = "force-dynamic";

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;

  const lead = await prisma.lead.findFirst({
    where: { id, isDeleted: false },
    include: {
      organization: true,
      product: true,
      contact: true,
      owner: true,
      activities: { orderBy: { occurredAt: "desc" }, take: 40 },
      followUps: { orderBy: { createdAt: "desc" } },
      meetings: { orderBy: { scheduledAt: "desc" } },
      demos: { orderBy: { scheduledAt: "desc" } },
      requirements: { orderBy: { receivedAt: "desc" } },
      clientRequests: {
        orderBy: { createdAt: "desc" },
        include: { resource: true },
      },
      opportunities: { orderBy: { createdAt: "desc" } },
      documents: { where: { isDeleted: false }, orderBy: { uploadedAt: "desc" } },
    },
  });

  if (!lead) notFound();
  if (!canViewAllLeads(user.role) && lead.ownerId !== user.id) notFound();

  const users = isManagerRole(user.role)
    ? await prisma.user.findMany({
        where: {
          isActive: true,
          role: { in: ["SalesMember", "SalesManager", "SocialMediaManager"] },
        },
        orderBy: { name: "asc" },
      })
    : [];

  return (
    <div>
      <PageHeader
        title={`${lead.leadCode} · ${lead.organization.orgName}`}
        description={`${lead.product.name} · Owner: ${lead.owner?.name ?? "Unassigned"}`}
        actions={
          <Link href="/leads" className="text-sm text-[var(--muted)] hover:text-[var(--ink)]">
            ← Leads
          </Link>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <Badge tone="accent">{lead.salesStage}</Badge>
        {lead.temperature ? <Badge tone="warn">{lead.temperature}</Badge> : null}
        {lead.qualification ? <Badge>{lead.qualification}</Badge> : null}
        <Badge tone="neutral">{lead.status}</Badge>
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <Panel title="Organization">
          <dl className="space-y-1 text-sm">
            <Row label="Industry" value={lead.organization.industry} />
            <Row
              label="Location"
              value={[lead.organization.city, lead.organization.state]
                .filter(Boolean)
                .join(", ")}
            />
            <Row label="Website" value={lead.organization.websiteDomain} />
            <Row label="Source" value={lead.source} />
            <Row label="Campaign" value={lead.campaign} />
          </dl>
        </Panel>
        <Panel title="Contact">
          <dl className="space-y-1 text-sm">
            <Row label="Name" value={lead.contact?.fullName} />
            <Row label="Designation" value={lead.contact?.designation} />
            <Row label="Email" value={lead.contact?.email} />
            <Row label="Phone" value={lead.contact?.phone} />
          </dl>
        </Panel>
        <Panel title="Next">
          <dl className="space-y-1 text-sm">
            <Row label="Next action" value={lead.nextAction} />
            <Row
              label="Follow-up"
              value={
                lead.nextFollowUpAt
                  ? lead.nextFollowUpAt.toLocaleString()
                  : null
              }
            />
            <Row label="Pain point" value={lead.painPoint} />
            {lead.wonValue != null ? (
              <Row label="Won value" value={`₹${lead.wonValue}`} />
            ) : null}
            {lead.lostReason ? <Row label="Lost reason" value={lead.lostReason} /> : null}
          </dl>
        </Panel>
      </div>

      <LeadWorkspace
        leadId={lead.id}
        salesStage={lead.salesStage}
        temperature={lead.temperature}
        isManager={isManagerRole(user.role)}
        users={users.map((u) => ({ id: u.id, name: u.name }))}
        followUps={lead.followUps.map((f) => ({
          id: f.id,
          followUpNumber: f.followUpNumber,
          status: f.status,
          dueAt: f.dueAt?.toISOString() ?? null,
          notes: f.notes,
        }))}
        meetings={lead.meetings.map((m) => ({
          id: m.id,
          meetingType: m.meetingType,
          status: m.status,
          scheduledAt: m.scheduledAt?.toISOString() ?? null,
          outcome: m.outcome,
        }))}
        demos={lead.demos.map((d) => ({
          id: d.id,
          status: d.status,
          scheduledAt: d.scheduledAt?.toISOString() ?? null,
          interestLevel: d.interestLevel,
        }))}
        requirements={lead.requirements.map((r) => ({
          id: r.id,
          requirementType: r.requirementType,
          description: r.description,
          status: r.status,
        }))}
        clientRequests={lead.clientRequests.map((r) => ({
          id: r.id,
          title: r.title,
          requestType: r.requestType,
          status: r.status,
          resource: r.resource
            ? {
                id: r.resource.id,
                title: r.resource.title,
                resourceType: r.resource.resourceType,
                sharePointUrl: r.resource.sharePointUrl,
              }
            : null,
        }))}
        opportunities={lead.opportunities.map((o) => ({
          id: o.id,
          opportunityValue: o.opportunityValue,
          probability: o.probability,
          salesStage: o.salesStage,
          negotiationStatus: o.negotiationStatus,
        }))}
        activities={lead.activities.map((a) => ({
          id: a.id,
          activityType: a.activityType,
          title: a.title,
          detail: a.detail,
          occurredAt: a.occurredAt.toISOString(),
        }))}
      />
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-[var(--muted)]">{label}</dt>
      <dd className="text-right font-medium">{value || "—"}</dd>
    </div>
  );
}
