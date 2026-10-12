import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser, isManagerRole } from "@/lib/auth";
import { canViewAllLeads } from "@/lib/constants";
import { logActivity, notify } from "@/lib/leads";

async function loadLead(id: string, userId: string, role: string) {
  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead || lead.isDeleted) return null;
  if (canViewAllLeads(role) || lead.ownerId === userId) return lead;
  return null;
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const lead = await prisma.lead.findFirst({
    where: { id, isDeleted: false },
    include: {
      organization: true,
      product: true,
      contact: true,
      owner: true,
      activities: { orderBy: { occurredAt: "desc" } },
      followUps: { orderBy: { createdAt: "desc" } },
      meetings: { orderBy: { scheduledAt: "desc" } },
      demos: { orderBy: { scheduledAt: "desc" } },
      requirements: { orderBy: { receivedAt: "desc" } },
      clientRequests: { orderBy: { createdAt: "desc" }, include: { resource: true } },
      opportunities: { orderBy: { createdAt: "desc" } },
      documents: { where: { isDeleted: false }, orderBy: { uploadedAt: "desc" } },
    },
  });
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!canViewAllLeads(user.role) && lead.ownerId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return NextResponse.json(lead);
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const lead = await loadLead(id, user.id, user.role);
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const action = String(body.action ?? "update");

  if (action === "qualify") {
    const temperature = String(body.temperature ?? "Warm");
    const ownerId = String(body.ownerId ?? lead.ownerId ?? user.id);
    const updated = await prisma.lead.update({
      where: { id },
      data: {
        salesStage: "Qualified",
        qualification: "Qualified",
        temperature,
        ownerId,
        nextAction: String(body.nextAction ?? "Plan next activity"),
        nextFollowUpAt: body.nextFollowUpAt
          ? new Date(String(body.nextFollowUpAt))
          : lead.nextFollowUpAt,
      },
    });
    await logActivity({
      leadId: id,
      userId: user.id,
      activityType: "StageChange",
      title: `Qualified as ${temperature}`,
    });
    if (ownerId && ownerId !== user.id) {
      await notify({
        userId: ownerId,
        leadId: id,
        eventType: "lead_assigned",
        title: `${lead.leadCode} assigned to you`,
        priority: "Medium",
      });
    }
    return NextResponse.json(updated);
  }

  if (action === "set_stage") {
    const salesStage = String(body.salesStage);
    const data: Record<string, unknown> = { salesStage };
    if (salesStage === "Won") {
      data.wonValue = body.wonValue != null ? Number(body.wonValue) : lead.wonValue;
      data.closedAt = body.closedAt ? new Date(String(body.closedAt)) : new Date();
      data.status = "Closed";
    }
    if (salesStage === "Lost") {
      data.lostReason = String(body.lostReason ?? "");
      data.competitor = String(body.competitor ?? "") || null;
      data.closedAt = new Date();
      data.status = "Closed";
    }
    if (salesStage === "OnHold") {
      data.status = "On Hold";
    }
    const updated = await prisma.lead.update({ where: { id }, data: data as never });
    await logActivity({
      leadId: id,
      userId: user.id,
      activityType: "StageChange",
      title: `Stage → ${salesStage}`,
      detail: body.notes ? String(body.notes) : null,
    });
    return NextResponse.json(updated);
  }

  if (action === "assign") {
    if (!isManagerRole(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const ownerId = String(body.ownerId ?? "") || null;
    const updated = await prisma.lead.update({
      where: { id },
      data: { ownerId },
    });
    if (ownerId) {
      await notify({
        userId: ownerId,
        leadId: id,
        eventType: "lead_assigned",
        title: `${lead.leadCode} reassigned to you`,
        priority: "Medium",
      });
    }
    await logActivity({
      leadId: id,
      userId: user.id,
      activityType: "Note",
      title: "Owner reassigned",
    });
    return NextResponse.json(updated);
  }

  if (action === "update") {
    const updated = await prisma.lead.update({
      where: { id },
      data: {
        temperature: body.temperature != null ? String(body.temperature) || null : undefined,
        painPoint: body.painPoint != null ? String(body.painPoint) : undefined,
        notes: body.notes != null ? String(body.notes) : undefined,
        nextAction: body.nextAction != null ? String(body.nextAction) : undefined,
        nextFollowUpAt: body.nextFollowUpAt
          ? new Date(String(body.nextFollowUpAt))
          : body.nextFollowUpAt === null
            ? null
            : undefined,
        campaign: body.campaign != null ? String(body.campaign) || null : undefined,
      },
    });
    return NextResponse.json(updated);
  }

  if (action === "soft_delete") {
    await prisma.lead.update({ where: { id }, data: { isDeleted: true } });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
