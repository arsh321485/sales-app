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

  const reqRow = await prisma.requirement.create({
    data: {
      leadId,
      requirementType: String(body.requirementType ?? "Business"),
      description: String(body.description ?? "").trim() || null,
      businessRequirement: String(body.businessRequirement ?? "").trim() || null,
      technicalRequirement: String(body.technicalRequirement ?? "").trim() || null,
      scope: String(body.scope ?? "").trim() || null,
      timeline: String(body.timeline ?? "").trim() || null,
      budget: String(body.budget ?? "").trim() || null,
      decisionMaker: String(body.decisionMaker ?? "").trim() || null,
      status: "Open",
      notes: String(body.notes ?? "").trim() || null,
      nextAction: String(body.nextAction ?? "").trim() || null,
    },
  });

  await logActivity({
    leadId,
    userId: user.id,
    activityType: "Requirement",
    title: "Requirement recorded",
    detail: reqRow.description,
  });

  if (lead.ownerId) {
    await notify({
      userId: lead.ownerId,
      leadId,
      eventType: "requirement_received",
      title: `Requirement on ${lead.leadCode}`,
      priority: "High",
    });
  }

  return NextResponse.json(reqRow);
}
