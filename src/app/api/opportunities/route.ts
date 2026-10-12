import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { canViewAllLeads } from "@/lib/constants";
import { logActivity } from "@/lib/leads";

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

  const opp = await prisma.opportunity.create({
    data: {
      leadId,
      ownerId: lead.ownerId ?? user.id,
      opportunityValue:
        body.opportunityValue != null ? Number(body.opportunityValue) : null,
      probability: body.probability != null ? Number(body.probability) : null,
      expectedClosureDate: body.expectedClosureDate
        ? new Date(String(body.expectedClosureDate))
        : null,
      negotiationStatus: String(body.negotiationStatus ?? "").trim() || null,
      salesStage: "Opportunity",
      notes: String(body.notes ?? "").trim() || null,
      nextAction: String(body.nextAction ?? "").trim() || null,
    },
  });

  await prisma.lead.update({
    where: { id: leadId },
    data: {
      salesStage: "Opportunity",
      nextAction: opp.nextAction ?? "Advance opportunity",
    },
  });

  await logActivity({
    leadId,
    userId: user.id,
    activityType: "StageChange",
    title: "Opportunity created",
    detail:
      opp.opportunityValue != null
        ? `Value: ${opp.opportunityValue}`
        : null,
  });

  return NextResponse.json(opp);
}

export async function PATCH(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const id = String(body.id ?? "");
  const opp = await prisma.opportunity.findUnique({ where: { id } });
  if (!opp) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const salesStage = body.salesStage != null ? String(body.salesStage) : opp.salesStage;
  const updated = await prisma.opportunity.update({
    where: { id },
    data: {
      opportunityValue:
        body.opportunityValue != null
          ? Number(body.opportunityValue)
          : opp.opportunityValue,
      probability:
        body.probability != null ? Number(body.probability) : opp.probability,
      expectedClosureDate: body.expectedClosureDate
        ? new Date(String(body.expectedClosureDate))
        : opp.expectedClosureDate,
      negotiationStatus:
        body.negotiationStatus != null
          ? String(body.negotiationStatus)
          : opp.negotiationStatus,
      salesStage,
      notes: body.notes != null ? String(body.notes) : opp.notes,
      nextAction: body.nextAction != null ? String(body.nextAction) : opp.nextAction,
    },
  });

  if (["Negotiation", "Opportunity"].includes(salesStage)) {
    await prisma.lead.update({
      where: { id: opp.leadId },
      data: { salesStage },
    });
  }

  await logActivity({
    leadId: opp.leadId,
    userId: user.id,
    activityType: "StageChange",
    title: `Opportunity updated (${salesStage})`,
  });

  return NextResponse.json(updated);
}
