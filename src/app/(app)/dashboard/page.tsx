import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireManager } from "@/lib/auth";
import { Badge, PageHeader, Panel, StatCard } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ member?: string }>;
}) {
  await requireManager();
  const sp = await searchParams;

  const members = await prisma.user.findMany({
    where: {
      isActive: true,
      role: { in: ["SalesMember", "SalesManager", "SocialMediaManager", "SuperAdmin"] },
    },
    include: { team: true },
    orderBy: { name: "asc" },
  });

  const selectedId =
    sp.member && members.some((m) => m.id === sp.member)
      ? sp.member
      : members[0]?.id;
  const selected = members.find((m) => m.id === selectedId);

  const stageGroups = await prisma.lead.groupBy({
    by: ["salesStage"],
    where: { isDeleted: false },
    _count: { _all: true },
  });

  const [
    openLeads,
    won,
    lost,
    onHold,
    openRequests,
    pendingFollowUps,
    meetingsUpcoming,
    demosUpcoming,
    wonValue,
    memberStats,
  ] = await Promise.all([
    prisma.lead.count({
      where: {
        isDeleted: false,
        salesStage: { notIn: ["Won", "Lost"] },
        ...(selectedId ? { ownerId: selectedId } : {}),
      },
    }),
    prisma.lead.count({
      where: {
        isDeleted: false,
        salesStage: "Won",
        ...(selectedId ? { ownerId: selectedId } : {}),
      },
    }),
    prisma.lead.count({
      where: {
        isDeleted: false,
        salesStage: "Lost",
        ...(selectedId ? { ownerId: selectedId } : {}),
      },
    }),
    prisma.lead.count({
      where: {
        isDeleted: false,
        salesStage: "OnHold",
        ...(selectedId ? { ownerId: selectedId } : {}),
      },
    }),
    prisma.clientRequest.count({
      where: {
        status: { in: ["Open", "In Progress"] },
        ...(selectedId ? { ownerId: selectedId } : {}),
      },
    }),
    prisma.followUp.count({
      where: {
        status: "Pending",
        ...(selectedId ? { ownerId: selectedId } : {}),
      },
    }),
    prisma.meeting.count({
      where: {
        status: { in: ["Scheduled", "To be Scheduled"] },
        scheduledAt: { gte: new Date() },
        ...(selectedId ? { ownerId: selectedId } : {}),
      },
    }),
    prisma.demo.count({
      where: {
        status: "Scheduled",
        scheduledAt: { gte: new Date() },
        ...(selectedId ? { ownerId: selectedId } : {}),
      },
    }),
    prisma.lead.aggregate({
      where: {
        isDeleted: false,
        salesStage: "Won",
        ...(selectedId ? { ownerId: selectedId } : {}),
      },
      _sum: { wonValue: true },
    }),
    Promise.all(
      members.map(async (m) => {
        const [active, closedWon, requests] = await Promise.all([
          prisma.lead.count({
            where: {
              ownerId: m.id,
              isDeleted: false,
              salesStage: { notIn: ["Won", "Lost"] },
            },
          }),
          prisma.lead.count({
            where: { ownerId: m.id, isDeleted: false, salesStage: "Won" },
          }),
          prisma.clientRequest.count({
            where: {
              ownerId: m.id,
              status: { in: ["Open", "In Progress"] },
            },
          }),
        ]);
        return { ...m, active, closedWon, requests };
      }),
    ),
  ]);

  return (
    <div>
      <PageHeader
        title="Master dashboard"
        description="KPIs across the flexible pipeline — filter by team member."
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {members.map((m) => (
          <Link
            key={m.id}
            href={`/dashboard?member=${m.id}`}
            className={`rounded-md px-3 py-1.5 text-sm ${
              m.id === selectedId
                ? "bg-[var(--accent)] text-white"
                : "bg-white border border-[var(--border)]"
            }`}
          >
            {m.name}
          </Link>
        ))}
      </div>

      {selected ? (
        <p className="mb-4 text-sm text-[var(--muted)]">
          Viewing: <strong>{selected.name}</strong> ({selected.role}
          {selected.team ? ` · ${selected.team.name}` : ""})
        </p>
      ) : null}

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Open leads" value={openLeads} />
        <StatCard label="Won" value={won} hint={wonValue._sum.wonValue ? `₹${wonValue._sum.wonValue}` : undefined} />
        <StatCard label="Lost / On hold" value={`${lost} / ${onHold}`} />
        <StatCard label="Open client requests" value={openRequests} />
        <StatCard label="Pending follow-ups" value={pendingFollowUps} />
        <StatCard label="Upcoming meetings" value={meetingsUpcoming} />
        <StatCard label="Upcoming demos" value={demosUpcoming} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Pipeline by stage (all leads)">
          <ul className="space-y-2 text-sm">
            {stageGroups.map((g) => (
              <li key={g.salesStage} className="flex justify-between">
                <span>{g.salesStage}</span>
                <Badge>{g._count._all}</Badge>
              </li>
            ))}
            {stageGroups.length === 0 ? (
              <li className="text-[var(--muted)]">No leads yet.</li>
            ) : null}
          </ul>
        </Panel>

        <Panel title="Team comparison">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-[11px] uppercase text-[var(--muted)]">
                <tr>
                  <th className="pb-2">Member</th>
                  <th className="pb-2">Open</th>
                  <th className="pb-2">Won</th>
                  <th className="pb-2">Requests</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {memberStats.map((m) => (
                  <tr key={m.id}>
                    <td className="py-2">{m.name}</td>
                    <td className="py-2">{m.active}</td>
                    <td className="py-2">{m.closedWon}</td>
                    <td className="py-2">{m.requests}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </div>
  );
}
