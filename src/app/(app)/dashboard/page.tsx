import { requireManager, isManagerRole } from "@/lib/auth";
import { DashboardClient } from "@/components/dashboard-client";
import { PHASES } from "@/lib/constants";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ member?: string }>;
}) {
  const user = await requireManager();
  void user;

  const sp = await searchParams;
  const members = await prisma.user.findMany({
    where: { isActive: true, role: { not: "Admin" } },
    include: { team: true },
    orderBy: { name: "asc" },
  });

  const selectedId =
    sp.member && members.some((m) => m.id === sp.member)
      ? sp.member
      : members[0]?.id;

  const selected = members.find((m) => m.id === selectedId) ?? members[0];

  if (!selected) {
    return <p className="text-sm text-[var(--muted)]">No team members found.</p>;
  }

  const [
    activeOwned,
    wonOwned,
    droppedOwned,
    meetingsDone,
    meetingsUpcoming,
    demosDone,
    demosUpcoming,
    outreachAttempts,
    activities,
    phaseBuckets,
    teamComparison,
  ] = await Promise.all([
    prisma.lead.count({
      where: { ownerId: selected.id, outcome: "Active", isDeleted: false },
    }),
    prisma.lead.count({
      where: { ownerId: selected.id, outcome: "Won", isDeleted: false },
    }),
    prisma.lead.count({
      where: { ownerId: selected.id, outcome: "Dropped", isDeleted: false },
    }),
    prisma.meeting.count({
      where: { ownerId: selected.id, status: "Completed" },
    }),
    prisma.meeting.count({
      where: {
        ownerId: selected.id,
        status: { in: ["Scheduled", "Rescheduled", "Meeting to be Scheduled"] },
      },
    }),
    prisma.demo.count({
      where: {
        OR: [{ conductedById: selected.id }, { prepOwnerId: selected.id }],
        status: { in: ["Demo Delivered", "Won"] },
      },
    }),
    prisma.demo.count({
      where: {
        OR: [{ conductedById: selected.id }, { prepOwnerId: selected.id }],
        status: { in: ["Demo Scheduled", "Ready for Demo", "Prep Complete"] },
      },
    }),
    prisma.outreachAttempt.count({
      where: { lead: { ownerId: selected.id } },
    }),
    prisma.activityLog.count({ where: { userId: selected.id } }),
    Promise.all(
      PHASES.map(async (p) => ({
        phase: p.id,
        label: p.short,
        name: p.name,
        count: await prisma.lead.count({
          where: {
            ownerId: selected.id,
            currentPhase: p.id,
            outcome: "Active",
            isDeleted: false,
          },
        }),
      })),
    ),
    Promise.all(
      members
        .filter((m) => !isManagerRole(m.role) || m.id === selected.id)
        .map(async (m) => {
          const [active, won, meetings, demos, activities, outreach] = await Promise.all([
            prisma.lead.count({
              where: { ownerId: m.id, outcome: "Active", isDeleted: false },
            }),
            prisma.lead.count({
              where: { ownerId: m.id, outcome: "Won", isDeleted: false },
            }),
            prisma.meeting.count({ where: { ownerId: m.id } }),
            prisma.demo.count({
              where: {
                OR: [{ conductedById: m.id }, { prepOwnerId: m.id }],
              },
            }),
            prisma.activityLog.count({ where: { userId: m.id } }),
            prisma.outreachAttempt.count({
              where: { lead: { ownerId: m.id } },
            }),
          ]);
          return {
            id: m.id,
            name: m.name,
            role: m.role,
            active,
            won,
            meetings,
            demos,
            touches: activities + outreach,
          };
        }),
    ),
  ]);

  const totalClosed = wonOwned + droppedOwned;
  const winRate = totalClosed === 0 ? 0 : Math.round((wonOwned / totalClosed) * 100);

  return (
    <DashboardClient
      members={members.map((m) => ({
        id: m.id,
        name: m.name,
        role: m.role,
        teamName: m.team?.name ?? null,
      }))}
      selectedId={selected.id}
      selectedName={selected.name}
      selectedRole={selected.role}
      kpis={{
        activeOwned,
        wonOwned,
        droppedOwned,
        meetingsDone,
        meetingsUpcoming,
        demosDone,
        demosUpcoming,
        outreachAttempts,
        activities,
        winRate,
      }}
      phaseBuckets={phaseBuckets}
      teamComparison={teamComparison}
    />
  );
}
