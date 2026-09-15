import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { demoScopeWhere, meetingScopeWhere } from "@/lib/scope";
import { CalendarView, type CalendarEvent } from "@/components/calendar-view";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const user = await requireUser();

  const [meetings, demos] = await Promise.all([
    prisma.meeting.findMany({
      where: {
        scheduledAt: { not: null },
        status: { notIn: ["Cancelled"] },
        ...meetingScopeWhere(user),
      },
      include: {
        lead: { include: { organization: true, product: true } },
      },
      orderBy: { scheduledAt: "asc" },
    }),
    prisma.demo.findMany({
      where: { scheduledAt: { not: null }, ...demoScopeWhere(user) },
      include: {
        lead: { include: { organization: true, product: true } },
      },
      orderBy: { scheduledAt: "asc" },
    }),
  ]);

  const events: CalendarEvent[] = [
    ...meetings
      .filter((m) => m.scheduledAt)
      .map((m) => ({
        id: m.id,
        kind: "meeting" as const,
        title: m.lead.organization.orgName,
        subtitle: `${m.meetingType ?? "Meeting"} · ${m.lead.product.code}`,
        startsAt: m.scheduledAt!.toISOString(),
        status: m.status,
        leadId: m.leadId,
        code: m.meetingCode,
        mode: m.mode,
      })),
    ...demos
      .filter((d) => d.scheduledAt)
      .map((d) => ({
        id: d.id,
        kind: "demo" as const,
        title: d.lead.organization.orgName,
        subtitle: `${d.demoType ?? "Demo"} · ${d.lead.product.code}`,
        startsAt: d.scheduledAt!.toISOString(),
        status: d.status,
        leadId: d.leadId,
        code: d.demoCode,
        mode: null,
      })),
  ];

  return <CalendarView events={events} />;
}
