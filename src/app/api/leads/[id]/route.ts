import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser, isManagerRole } from "@/lib/auth";
import { transitionLead } from "@/lib/phase-engine";

async function canAccessLead(userId: string, role: string, leadId: string) {
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead || lead.isDeleted) return null;
  if (isManagerRole(role) || lead.ownerId === userId) return lead;
  return null;
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const lead = await canAccessLead(user.id, user.role, id);
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const body = await req.json();
    const action = String(body.action ?? "");

    if (action === "update_status") {
      const phaseStatus = String(body.phaseStatus ?? lead.phaseStatus);
      const nextAction = body.nextAction != null ? String(body.nextAction) : lead.nextAction;
      const nextActionDate = body.nextActionDate
        ? new Date(String(body.nextActionDate))
        : lead.nextActionDate;
      const healthFlag = body.healthFlag ? String(body.healthFlag) : lead.healthFlag;

      const updated = await prisma.lead.update({
        where: { id },
        data: { phaseStatus, nextAction, nextActionDate, healthFlag },
      });
      await prisma.activityLog.create({
        data: {
          leadId: id,
          userId: user.id,
          activityType: "status_update",
          summary: `Status → ${phaseStatus}`,
        },
      });
      return NextResponse.json(updated);
    }

    if (action === "qualify") {
      // Phase 1 exit → Phase 2
      if (lead.currentPhase !== 1) {
        return NextResponse.json({ error: "Lead is not in Research" }, { status: 400 });
      }
      const outreachOwnerId = String(body.outreachOwnerId ?? user.id);
      await prisma.research.update({
        where: { leadId: id },
        data: {
          status: "Qualified",
          outreachOwnerAssigned: true,
        },
      });
      await prisma.lead.update({
        where: { id },
        data: { ownerId: outreachOwnerId },
      });
      const updated = await transitionLead({
        leadId: id,
        toPhase: 2,
        toStatus: "Pending Outreach",
        changedById: user.id,
        reason: "Qualified and handed to outreach",
      });
      await prisma.notification.create({
        data: {
          userId: outreachOwnerId,
          leadId: id,
          eventType: "handoff",
          title: "New lead for outreach",
          body: `${lead.leadCode} is ready for first contact`,
          priority: "High",
        },
      });
      return NextResponse.json(updated);
    }

    if (action === "meeting_agreed") {
      if (![2, 3].includes(lead.currentPhase)) {
        return NextResponse.json({ error: "Lead not in outreach/follow-up" }, { status: 400 });
      }
      const bdmId = String(body.bdmId ?? "");
      if (!bdmId) {
        return NextResponse.json({ error: "Assign a BDM" }, { status: 400 });
      }
      await prisma.lead.update({ where: { id }, data: { ownerId: bdmId } });
      const updated = await transitionLead({
        leadId: id,
        toPhase: 4,
        toStatus: "Meeting to be Scheduled",
        changedById: user.id,
        reason: "Meeting agreed",
      });
      await prisma.notification.create({
        data: {
          userId: bdmId,
          leadId: id,
          eventType: "meeting_agreed",
          title: "Meeting agreed — schedule it",
          body: lead.leadCode,
          priority: "Critical",
        },
      });
      return NextResponse.json(updated);
    }

    if (action === "drop") {
      const reason = String(body.dropReason ?? "Not Interested");
      const updated = await prisma.lead.update({
        where: { id },
        data: {
          outcome: "Dropped",
          dropReason: reason,
          droppedAtPhase: lead.currentPhase,
          phaseStatus: "Dropped",
        },
      });
      await prisma.activityLog.create({
        data: {
          leadId: id,
          userId: user.id,
          activityType: "dropped",
          summary: `Dropped: ${reason}`,
        },
      });
      return NextResponse.json(updated);
    }

    if (action === "assign_owner") {
      if (!isManagerRole(user.role)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const ownerId = String(body.ownerId ?? "") || null;
      const updated = await prisma.lead.update({
        where: { id },
        data: { ownerId },
      });
      await prisma.activityLog.create({
        data: {
          leadId: id,
          userId: user.id,
          activityType: "reassign",
          summary: `Owner reassigned`,
        },
      });
      return NextResponse.json(updated);
    }

    if (action === "edit_details") {
      const nextAction =
        body.nextAction != null ? String(body.nextAction).trim() : lead.nextAction;
      const nextActionDate = body.nextActionDate
        ? new Date(String(body.nextActionDate))
        : lead.nextActionDate;
      const icpFit =
        body.icpFit != null ? String(body.icpFit).trim() || null : lead.icpFit;
      const triggerEvent =
        body.triggerEvent != null
          ? String(body.triggerEvent).trim() || null
          : lead.triggerEvent;

      const updated = await prisma.lead.update({
        where: { id },
        data: { nextAction, nextActionDate, icpFit, triggerEvent },
      });

      if (body.orgName || body.city || body.state || body.industry) {
        await prisma.organization.update({
          where: { id: lead.organizationId },
          data: {
            ...(body.orgName != null
              ? { orgName: String(body.orgName).trim() }
              : {}),
            ...(body.city != null ? { city: String(body.city).trim() || null } : {}),
            ...(body.state != null
              ? { state: String(body.state).trim() || null }
              : {}),
            ...(body.industry != null
              ? { industry: String(body.industry).trim() || null }
              : {}),
          },
        });
      }

      await prisma.activityLog.create({
        data: {
          leadId: id,
          userId: user.id,
          activityType: "edit",
          summary: "Lead details updated",
        },
      });
      return NextResponse.json(updated);
    }

    if (action === "soft_delete") {
      const updated = await prisma.lead.update({
        where: { id },
        data: { isDeleted: true },
      });
      await prisma.activityLog.create({
        data: {
          leadId: id,
          userId: user.id,
          activityType: "deleted",
          summary: "Lead soft-deleted",
        },
      });
      return NextResponse.json(updated);
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const lead = await canAccessLead(user.id, user.role, id);
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.lead.update({
    where: { id },
    data: { isDeleted: true },
  });
  await prisma.activityLog.create({
    data: {
      leadId: id,
      userId: user.id,
      activityType: "deleted",
      summary: "Lead soft-deleted",
    },
  });
  return NextResponse.json({ ok: true });
}
