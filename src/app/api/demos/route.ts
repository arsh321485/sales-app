import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser, isManagerRole } from "@/lib/auth";
import { nextDemoCode } from "@/lib/codes";
import { transitionLead } from "@/lib/phase-engine";

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
  const clientConfirmed = Boolean(body.clientConfirmed);
  const prepOwnerId = String(body.prepOwnerId ?? user.id);

  const seq = (await prisma.demo.count({ where: { leadId } })) + 1;
  const demo = await prisma.demo.create({
    data: {
      demoCode: await nextDemoCode(),
      leadId,
      demoNo: seq,
      demoType: String(body.demoType ?? "Standard"),
      requestedAt: new Date(),
      clientConfirmedAt: clientConfirmed ? new Date() : null,
      prepOwnerId,
      conductedById: prepOwnerId,
      scheduledAt,
      status: clientConfirmed
        ? scheduledAt
          ? "Demo Scheduled"
          : "Ready for Demo"
        : "Awaiting Client Confirmation",
      prepStatus: "Assigned",
    },
  });

  if (lead.currentPhase < 7) {
    await transitionLead({
      leadId,
      toPhase: 7,
      toStatus: demo.status,
      changedById: user.id,
      reason: "Demo requested",
    });
  } else {
    await prisma.lead.update({
      where: { id: leadId },
      data: {
        phaseStatus: demo.status,
        nextAction: "Deliver demo",
        nextActionDate: scheduledAt,
      },
    });
  }

  await prisma.notification.create({
    data: {
      userId: prepOwnerId,
      leadId,
      eventType: "demo_assigned",
      title: "Demo assigned to you",
      body: demo.demoCode,
      priority: "High",
    },
  });

  return NextResponse.json(demo);
}

export async function PATCH(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const id = String(body.id ?? "");
  const demo = await prisma.demo.findUnique({
    where: { id },
    include: { lead: true },
  });
  if (!demo) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (
    !isManagerRole(user.role) &&
    demo.prepOwnerId !== user.id &&
    demo.conductedById !== user.id &&
    demo.lead.ownerId !== user.id
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const status = String(body.status ?? demo.status);
  const decision = body.decision != null ? String(body.decision) : demo.decision;
  const feedback = body.feedback != null ? String(body.feedback) : demo.feedback;

  const updated = await prisma.demo.update({
    where: { id },
    data: {
      status,
      decision,
      feedback,
      deliveredAt: status === "Demo Delivered" ? new Date() : demo.deliveredAt,
    },
  });

  if (decision === "Won") {
    await prisma.lead.update({
      where: { id: demo.leadId },
      data: { outcome: "Won", phaseStatus: "Won", wonValue: body.wonValue ?? undefined },
    });
    await transitionLead({
      leadId: demo.leadId,
      toPhase: 8,
      toStatus: "Handover Pending",
      changedById: user.id,
      reason: "Won — start onboarding",
      outcome: "Won",
    });
    await prisma.onboarding.upsert({
      where: { leadId: demo.leadId },
      create: { leadId: demo.leadId, status: "Handover Pending" },
      update: {},
    });
  }

  return NextResponse.json(updated);
}
