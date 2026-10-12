import Link from "next/link";
import { format, startOfDay, endOfDay, isBefore } from "date-fns";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { leadScopeWhere } from "@/lib/scope";
import { Badge, PageHeader, Panel, StatCard } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function MyWorkPage() {
  const user = await requireUser();
  const scope = leadScopeWhere(user);
  const todayStart = startOfDay(new Date());
  const todayEnd = endOfDay(new Date());
  const now = new Date();

  const [
    followUpsDue,
    meetingsToday,
    demosToday,
    openRequests,
    pendingLeads,
    overdueFollowUps,
    notifications,
  ] = await Promise.all([
    prisma.followUp.findMany({
      where: {
        status: "Pending",
        dueAt: { gte: todayStart, lte: todayEnd },
        lead: { isDeleted: false, ...scope },
      },
      include: { lead: { include: { organization: true, product: true } } },
      orderBy: { dueAt: "asc" },
      take: 20,
    }),
    prisma.meeting.findMany({
      where: {
        scheduledAt: { gte: todayStart, lte: todayEnd },
        lead: { isDeleted: false, ...scope },
      },
      include: { lead: { include: { organization: true } } },
      orderBy: { scheduledAt: "asc" },
    }),
    prisma.demo.findMany({
      where: {
        scheduledAt: { gte: todayStart, lte: todayEnd },
        lead: { isDeleted: false, ...scope },
      },
      include: { lead: { include: { organization: true } } },
      orderBy: { scheduledAt: "asc" },
    }),
    prisma.clientRequest.findMany({
      where: {
        status: { in: ["Open", "In Progress"] },
        lead: { isDeleted: false, ...scope },
      },
      include: {
        lead: { include: { organization: true, product: true } },
        resource: true,
      },
      orderBy: { createdAt: "desc" },
      take: 15,
    }),
    prisma.lead.findMany({
      where: {
        isDeleted: false,
        salesStage: { in: ["New", "Qualified"] },
        ...scope,
      },
      include: { organization: true, product: true },
      orderBy: { updatedAt: "desc" },
      take: 10,
    }),
    prisma.followUp.findMany({
      where: {
        status: "Pending",
        dueAt: { lt: todayStart },
        lead: { isDeleted: false, ...scope },
      },
      include: { lead: { include: { organization: true } } },
      take: 15,
    }),
    prisma.notification.findMany({
      where: { userId: user.id, isRead: false },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ]);

  // Mark overdue in memory for display
  const overdue = overdueFollowUps.filter(
    (f) => f.dueAt && isBefore(f.dueAt, now),
  );

  return (
    <div>
      <PageHeader
        title="My Work"
        description="What do I need to do next? Today’s follow-ups, meetings, demos and open client requests."
        actions={
          <Link
            href="/leads/new"
            className="rounded-md bg-[var(--accent)] px-3 py-2 text-sm font-medium text-white"
          >
            New outreach
          </Link>
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Follow-ups today" value={followUpsDue.length} />
        <StatCard
          label="Meetings + demos today"
          value={meetingsToday.length + demosToday.length}
        />
        <StatCard label="Open client requests" value={openRequests.length} />
        <StatCard label="Overdue follow-ups" value={overdue.length} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Today — follow-ups" className="lg:col-span-2">
          <ItemList
            empty="No follow-ups due today."
            items={followUpsDue.map((f) => ({
              href: `/leads/${f.leadId}`,
              title: `${f.lead.leadCode} · ${f.lead.organization.orgName}`,
              meta: `Follow-up ${f.followUpNumber}${f.dueAt ? ` · ${format(f.dueAt, "h:mm a")}` : ""}`,
            }))}
          />
        </Panel>

        <Panel title="Notifications">
          <ItemList
            empty="No unread notifications."
            items={notifications.map((n) => ({
              href: n.leadId ? `/leads/${n.leadId}` : "/notifications",
              title: n.title,
              meta: n.priority,
            }))}
          />
        </Panel>

        <Panel title="Today — meetings & demos" className="lg:col-span-2">
          <ul className="space-y-2 text-sm">
            {[
              ...meetingsToday.map((m) => ({
                id: m.id,
                href: `/leads/${m.leadId}`,
                label: `Meeting · ${m.lead.organization.orgName}`,
                time: m.scheduledAt,
              })),
              ...demosToday.map((d) => ({
                id: d.id,
                href: `/leads/${d.leadId}`,
                label: `Demo · ${d.lead.organization.orgName}`,
                time: d.scheduledAt,
              })),
            ].length === 0 ? (
              <li className="text-[var(--muted)]">Nothing scheduled today.</li>
            ) : (
              [
                ...meetingsToday.map((m) => ({
                  id: m.id,
                  href: `/leads/${m.leadId}`,
                  label: `Meeting · ${m.lead.organization.orgName}`,
                  time: m.scheduledAt,
                })),
                ...demosToday.map((d) => ({
                  id: d.id,
                  href: `/leads/${d.leadId}`,
                  label: `Demo · ${d.lead.organization.orgName}`,
                  time: d.scheduledAt,
                })),
              ].map((item) => (
                <li key={item.id}>
                  <Link href={item.href} className="font-medium hover:text-[var(--accent)]">
                    {item.label}
                  </Link>
                  <p className="text-xs text-[var(--muted)]">
                    {item.time ? format(item.time, "h:mm a") : "—"}
                  </p>
                </li>
              ))
            )}
          </ul>
        </Panel>

        <Panel title="Overdue">
          <ItemList
            empty="No overdue items."
            items={overdue.map((f) => ({
              href: `/leads/${f.leadId}`,
              title: f.lead.organization.orgName,
              meta: `FU ${f.followUpNumber} · ${f.dueAt ? format(f.dueAt, "dd MMM") : ""}`,
            }))}
          />
        </Panel>

        <Panel title="Open client requests" className="lg:col-span-2">
          <ul className="space-y-2 text-sm">
            {openRequests.length === 0 ? (
              <li className="text-[var(--muted)]">No open requests.</li>
            ) : (
              openRequests.map((r) => (
                <li
                  key={r.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--border)] px-3 py-2"
                >
                  <div>
                    <Link
                      href={`/leads/${r.leadId}`}
                      className="font-medium hover:text-[var(--accent)]"
                    >
                      {r.lead.leadCode} · {r.title}
                    </Link>
                    <p className="text-xs text-[var(--muted)]">
                      {r.requestType}
                      {r.resource ? ` · ${r.resource.title}` : ""}
                    </p>
                  </div>
                  <Badge tone="warn">{r.status}</Badge>
                </li>
              ))
            )}
          </ul>
        </Panel>

        <Panel title="Pending new / qualified leads">
          <ItemList
            empty="Queue empty."
            items={pendingLeads.map((l) => ({
              href: `/leads/${l.id}`,
              title: `${l.leadCode} · ${l.organization.orgName}`,
              meta: `${l.product.name} · ${l.salesStage}`,
            }))}
          />
        </Panel>
      </div>
    </div>
  );
}

function ItemList({
  items,
  empty,
}: {
  items: { href: string; title: string; meta?: string }[];
  empty: string;
}) {
  if (items.length === 0) {
    return <p className="text-sm text-[var(--muted)]">{empty}</p>;
  }
  return (
    <ul className="space-y-2 text-sm">
      {items.map((item, i) => (
        <li key={`${item.href}-${i}`}>
          <Link href={item.href} className="font-medium hover:text-[var(--accent)]">
            {item.title}
          </Link>
          {item.meta ? (
            <p className="text-xs text-[var(--muted)]">{item.meta}</p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
