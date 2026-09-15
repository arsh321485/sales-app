import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser, isManagerRole } from "@/lib/auth";
import { nextMeetingCode } from "@/lib/codes";

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const leadId = String(body.leadId ?? "");
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead || lead.isDeleted) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }
  if (!isManagerRole(user.role) && lead.ownerId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const scheduledAt = body.scheduledAt ? new Date(String(body.scheduledAt)) : null;
  const meeting = await prisma.meeting.create({
    data: {
      meetingCode: await nextMeetingCode(),
      leadId,
      ownerId: user.id,
      meetingType: String(body.meetingType ?? "Discovery"),
      mode: String(body.mode ?? "Online"),
      meetingLink: String(body.meetingLink ?? "").trim() || null,
      scheduledAt,
      status: scheduledAt ? "Scheduled" : "Meeting to be Scheduled",
      attendees: String(body.attendees ?? "").trim() || null,
      notes: String(body.notes ?? "").trim() || null,
    },
  });

  if (lead.currentPhase === 4) {
    await prisma.lead.update({
      where: { id: leadId },
      data: {
        phaseStatus: scheduledAt ? "Scheduled" : lead.phaseStatus,
        nextAction: "Conduct meeting",
        nextActionDate: scheduledAt,
      },
    });
  }

  await prisma.activityLog.create({
    data: {
      leadId,
      userId: user.id,
      activityType: "meeting_scheduled",
      summary: `Meeting ${meeting.meetingCode} booked`,
    },
  });

  return NextResponse.json(meeting);
}

export async function PATCH(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const id = String(body.id ?? "");
  const meeting = await prisma.meeting.findUnique({
    where: { id },
    include: { lead: true },
  });
  if (!meeting) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (
    !isManagerRole(user.role) &&
    meeting.ownerId !== user.id &&
    meeting.lead.ownerId !== user.id
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const status = String(body.status ?? meeting.status);
  const outcome = body.outcome != null ? String(body.outcome) : meeting.outcome;
  const notes = body.notes != null ? String(body.notes) : meeting.notes;

  const updated = await prisma.meeting.update({
    where: { id },
    data: {
      status,
      outcome,
      notes,
      completedAt: status === "Completed" ? new Date() : meeting.completedAt,
    },
  });

  if (status === "Completed" && outcome === "Proceed") {
    const { transitionLead } = await import("@/lib/phase-engine");
    await transitionLead({
      leadId: meeting.leadId,
      toPhase: 5,
      toStatus: "Requirements Being Captured",
      changedById: user.id,
      reason: "Meeting completed — proceed",
    });
    await prisma.requirement.upsert({
      where: { leadId: meeting.leadId },
      create: { leadId: meeting.leadId, status: "Requirements Being Captured" },
      update: {},
    });
  }

  return NextResponse.json(updated);
}
