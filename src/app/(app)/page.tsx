import Link from "next/link";
import { format } from "date-fns";
import { prisma } from "@/lib/db";
import { requireUser, isManagerRole } from "@/lib/auth";
import {
  demoScopeWhere,
  leadScopeWhere,
  meetingScopeWhere,
  notificationScopeWhere,
} from "@/lib/scope";
import { Badge, PageHeader, Panel, StatCard } from "@/components/ui";
import { healthTone, phaseName } from "@/lib/constants";
import type {
  DemoToday,
  LeadListItem,
  MeetingToday,
  NotificationLite,
} from "@/types/models";

export const dynamic = "force-dynamic";

export default async function MyDayPage() {
  const user = await requireUser();
  const manager = isManagerRole(user.role);
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);

  const leadScope = leadScopeWhere(user);

  const [activeLeads, dueToday, meetingsToday, demosToday, notifications, overdue] =
    await Promise.all([
      prisma.lead.count({
        where: { outcome: "Active", isDeleted: false, ...leadScope },
      }),
      prisma.lead.findMany({
        where: {
          outcome: "Active",
          nextActionDate: { gte: start, lte: end },
          isDeleted: false,
          ...leadScope,
        },
        include: { organization: true, product: true },
        orderBy: { nextActionDate: "asc" },
        take: 12,
      }),
      prisma.meeting.findMany({
        where: {
          scheduledAt: { gte: start, lte: end },
          status: { not: "Cancelled" },
          ...meetingScopeWhere(user),
        },
        include: { lead: { include: { organization: true } } },
        orderBy: { scheduledAt: "asc" },
      }),
      prisma.demo.findMany({
        where: {
          scheduledAt: { gte: start, lte: end },
          ...demoScopeWhere(user),
        },
        include: { lead: { include: { organization: true } } },
        orderBy: { scheduledAt: "asc" },
      }),
      prisma.notification.findMany({
        where: notificationScopeWhere(user),
        orderBy: { createdAt: "desc" },
        take: 8,
        include: { lead: true },
      }),
      prisma.lead.count({
        where: {
          healthFlag: { in: ["Overdue", "At Risk"] },
          outcome: "Active",
          ...leadScope,
        },
      }),
    ]);

  return (
    <div>
      <PageHeader
        title={manager ? "Team day" : "My Day"}
        description={
          manager
            ? `Signed in as ${user.name} (Head) — showing the whole team's work.`
            : `Hi ${user.name.split(" ")[0]} — only leads and tasks assigned to you.`
        }
        actions={
          <div className="flex gap-2">
            {manager ? (
              <Link
                href="/dashboard"
                className="rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm"
              >
                Performance dashboard
              </Link>
            ) : null}
            <Link
              href="/calendar"
              className="rounded-md bg-[var(--accent)] px-3 py-2 text-sm font-medium text-white"
            >
              Open calendar
            </Link>
          </div>
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={manager ? "Active pipeline" : "My active leads"}
          value={activeLeads}
        />
        <StatCard label="Actions due today" value={dueToday.length} />
        <StatCard
          label="Meetings + demos today"
          value={meetingsToday.length + demosToday.length}
        />
        <StatCard label="Overdue / at risk" value={overdue} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Do today" className="lg:col-span-2">
          <ul className="divide-y divide-[var(--border)]">
            {dueToday.length === 0 ? (
              <li className="py-6 text-sm text-[var(--muted)]">
                Nothing due today on your queue.
              </li>
            ) : (
              dueToday.map((lead: LeadListItem) => (
                <li key={lead.id} className="flex items-start justify-between gap-3 py-3">
                  <div>
                    <Link
                      href={`/leads/${lead.id}`}
                      className="font-medium text-[var(--ink)] hover:text-[var(--accent)]"
                    >
                      {lead.organization.orgName}
                    </Link>
                    <p className="text-xs text-[var(--muted)]">
                      {lead.leadCode} · {lead.product.name} · {phaseName(lead.currentPhase)}
                    </p>
                    <p className="mt-1 text-sm">{lead.nextAction}</p>
                  </div>
                  <Badge tone={healthTone(lead.healthFlag) as "ok" | "warn" | "danger"}>
                    {lead.healthFlag}
                  </Badge>
                </li>
              ))
            )}
          </ul>
        </Panel>

        <Panel title="Notifications">
          <ul className="space-y-3">
            {notifications.length === 0 ? (
              <li className="text-sm text-[var(--muted)]">No notifications.</li>
            ) : (
              notifications.map((n: NotificationLite) => (
                <li key={n.id} className="rounded-lg bg-[var(--surface)] px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">{n.title}</p>
                    <Badge
                      tone={
                        n.priority === "Critical"
                          ? "danger"
                          : n.priority === "High"
                            ? "warn"
                            : "neutral"
                      }
                    >
                      {n.priority}
                    </Badge>
                  </div>
                  {n.body ? <p className="mt-1 text-xs text-[var(--muted)]">{n.body}</p> : null}
                </li>
              ))
            )}
          </ul>
        </Panel>

        <Panel title="Today's meetings">
          {meetingsToday.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">No meetings today.</p>
          ) : (
            <ul className="space-y-2">
              {meetingsToday.map((m: MeetingToday) => (
                <li key={m.id} className="rounded-lg border border-[var(--border)] px-3 py-2">
                  <p className="text-sm font-medium">{m.lead.organization.orgName}</p>
                  <p className="text-xs text-[var(--muted)]">
                    {m.scheduledAt ? format(m.scheduledAt, "h:mm a") : "—"} · {m.meetingType} ·{" "}
                    {m.mode}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Today's demos" className="lg:col-span-2">
          {demosToday.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">No demos today.</p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {demosToday.map((d: DemoToday) => (
                <li key={d.id} className="rounded-lg border border-[var(--border)] px-3 py-2">
                  <p className="text-sm font-medium">{d.lead.organization.orgName}</p>
                  <p className="text-xs text-[var(--muted)]">
                    {d.scheduledAt ? format(d.scheduledAt, "h:mm a") : "—"} · {d.demoCode} ·{" "}
                    {d.status}
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
