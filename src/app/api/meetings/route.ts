import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { canViewAllLeads } from "@/lib/constants";
import { logActivity, notify } from "@/lib/leads";

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const leadId = String(body.leadId ?? "");
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead || lead.isDeleted) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }
  if (!canViewAllLeads(user.role) && lead.ownerId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const scheduledAt = body.scheduledAt ? new Date(String(body.scheduledAt)) : null;
  const meeting = await prisma.meeting.create({
    data: {
      leadId,
      ownerId: lead.ownerId ?? user.id,
      meetingType: String(body.meetingType ?? "Discovery"),
      scheduledAt,
      participants: String(body.participants ?? "").trim() || null,
      status: scheduledAt ? "Scheduled" : "To be Scheduled",
      notes: String(body.notes ?? "").trim() || null,
      nextAction: String(body.nextAction ?? "").trim() || null,
    },
  });

  await prisma.lead.update({
    where: { id: leadId },
    data: {
      nextAction: "Conduct meeting",
      nextFollowUpAt: scheduledAt,
      salesStage:
        lead.salesStage === "New" || lead.salesStage === "Qualified"
          ? "Engaged"
          : lead.salesStage,
    },
  });

  await logActivity({
    leadId,
    userId: user.id,
    activityType: "Meeting",
    title: `Meeting scheduled`,
    detail: meeting.meetingType,
  });

  if (lead.ownerId) {
    await notify({
      userId: lead.ownerId,
      leadId,
      eventType: "meeting_scheduled",
      title: `Meeting on ${lead.leadCode}`,
      priority: "High",
    });
  }

  return NextResponse.json(meeting);
}

export async function PATCH(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const id = String(body.id ?? "");
  const meeting = await prisma.meeting.findUnique({ where: { id } });
  if (!meeting) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const status = String(body.status ?? meeting.status);
  const updated = await prisma.meeting.update({
    where: { id },
    data: {
      status,
      outcome: body.outcome != null ? String(body.outcome) : meeting.outcome,
      notes: body.notes != null ? String(body.notes) : meeting.notes,
      nextAction: body.nextAction != null ? String(body.nextAction) : meeting.nextAction,
    },
  });

  await logActivity({
    leadId: meeting.leadId,
    userId: user.id,
    activityType: "Meeting",
    title: `Meeting → ${status}`,
    detail: updated.outcome,
  });

  return NextResponse.json(updated);
}
