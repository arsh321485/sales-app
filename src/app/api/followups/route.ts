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

  const count = await prisma.followUp.count({ where: { leadId } });
  const dueAt = body.dueAt ? new Date(String(body.dueAt)) : null;
  const fu = await prisma.followUp.create({
    data: {
      leadId,
      followUpNumber: count + 1,
      ownerId: lead.ownerId ?? user.id,
      dueAt,
      status: "Pending",
      notes: String(body.notes ?? "").trim() || null,
      nextAction: String(body.nextAction ?? "").trim() || null,
    },
  });

  await prisma.lead.update({
    where: { id: leadId },
    data: {
      nextFollowUpAt: dueAt,
      nextAction: fu.nextAction ?? `Follow-up ${fu.followUpNumber}`,
      salesStage: lead.salesStage === "New" ? "Engaged" : lead.salesStage,
    },
  });

  await logActivity({
    leadId,
    userId: user.id,
    activityType: "FollowUp",
    title: `Follow-up ${fu.followUpNumber} created`,
    detail: fu.notes,
  });

  if (lead.ownerId) {
    await notify({
      userId: lead.ownerId,
      leadId,
      eventType: "followup_created",
      title: `Follow-up ${fu.followUpNumber} on ${lead.leadCode}`,
      priority: "Medium",
    });
  }

  return NextResponse.json(fu);
}

export async function PATCH(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const id = String(body.id ?? "");
  const fu = await prisma.followUp.findUnique({
    where: { id },
    include: { lead: true },
  });
  if (!fu) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const status = String(body.status ?? fu.status);
  const updated = await prisma.followUp.update({
    where: { id },
    data: {
      status,
      notes: body.notes != null ? String(body.notes) : fu.notes,
      completedAt: status === "Completed" ? new Date() : fu.completedAt,
      dueAt: body.dueAt ? new Date(String(body.dueAt)) : fu.dueAt,
    },
  });

  await logActivity({
    leadId: fu.leadId,
    userId: user.id,
    activityType: "FollowUp",
    title: `Follow-up ${fu.followUpNumber} → ${status}`,
  });

  return NextResponse.json(updated);
}
