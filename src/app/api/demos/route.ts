import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { canViewAllLeads, defaultTeamsMeetingUrl } from "@/lib/constants";
import { logActivity, notify } from "@/lib/leads";

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const leadId = String(body.leadId ?? "");
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: { product: true },
  });
  if (!lead || lead.isDeleted) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }
  if (!canViewAllLeads(user.role) && lead.ownerId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const scheduledAt = body.scheduledAt ? new Date(String(body.scheduledAt)) : null;
  const teamsMeetingUrl =
    String(body.teamsMeetingUrl ?? "").trim() || defaultTeamsMeetingUrl();
  const count = await prisma.demo.count({ where: { leadId } });
  const demoCode =
    String(body.demoCode ?? "").trim() ||
    `${lead.product.prefix}-DMO-${String(count + 1).padStart(3, "0")}`;

  const demo = await prisma.demo.create({
    data: {
      leadId,
      ownerId: lead.ownerId ?? user.id,
      demoCode,
      scheduledAt,
      participants: String(body.participants ?? "").trim() || null,
      status: "Scheduled",
      nextAction: String(body.nextAction ?? "").trim() || null,
      teamsMeetingUrl,
    },
  });

  await prisma.lead.update({
    where: { id: leadId },
    data: {
      nextAction: "demo",
      nextPhase: "Demo",
      nextFollowUpAt: scheduledAt,
    },
  });

  await logActivity({
    leadId,
    userId: user.id,
    activityType: "Demo",
    title: "Demo scheduled",
    detail: teamsMeetingUrl,
  });

  if (lead.ownerId) {
    await notify({
      userId: lead.ownerId,
      leadId,
      eventType: "demo_scheduled",
      title: `Demo on ${lead.leadCode}`,
      priority: "High",
    });
  }

  return NextResponse.json(demo);
}

export async function PATCH(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const id = String(body.id ?? "");
  const demo = await prisma.demo.findUnique({ where: { id } });
  if (!demo) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.demo.update({
    where: { id },
    data: {
      status: body.status != null ? String(body.status) : demo.status,
      feedback: body.feedback != null ? String(body.feedback) : demo.feedback,
      interestLevel:
        body.interestLevel != null ? String(body.interestLevel) : demo.interestLevel,
      requirementsIdentified:
        body.requirementsIdentified != null
          ? String(body.requirementsIdentified)
          : demo.requirementsIdentified,
      nextAction: body.nextAction != null ? String(body.nextAction) : demo.nextAction,
      teamsMeetingUrl:
        body.teamsMeetingUrl != null
          ? String(body.teamsMeetingUrl)
          : demo.teamsMeetingUrl,
    },
  });

  await logActivity({
    leadId: demo.leadId,
    userId: user.id,
    activityType: "Demo",
    title: `Demo → ${updated.status}`,
  });

  return NextResponse.json(updated);
}
