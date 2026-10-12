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

  const requestType = String(body.requestType ?? "proposal");
  const title = String(body.title ?? `${requestType} request`).trim();

  // Match SharePoint resource by product + request type
  const resourceTypeMap: Record<string, string> = {
    proposal: "Proposal",
    pricing: "Pricing",
    presentation: "Presentation",
    case_study: "Case Study",
  };
  const resourceType = resourceTypeMap[requestType] ?? null;
  let resourceId: string | null = null;
  if (resourceType) {
    const resource = await prisma.salesResource.findFirst({
      where: {
        productId: lead.productId,
        resourceType,
        isActive: true,
      },
    });
    resourceId = resource?.id ?? null;
  }

  const cr = await prisma.clientRequest.create({
    data: {
      leadId,
      ownerId: lead.ownerId ?? user.id,
      requestType,
      title,
      status: "Open",
      priority: "High",
      resourceId,
      notes: String(body.notes ?? "").trim() || null,
      dueAt: body.dueAt ? new Date(String(body.dueAt)) : null,
    },
    include: { resource: true },
  });

  await logActivity({
    leadId,
    userId: user.id,
    activityType: "ClientRequest",
    title: `Client requested: ${title}`,
  });

  if (lead.ownerId) {
    await notify({
      userId: lead.ownerId,
      leadId,
      eventType: "client_request",
      title: `${lead.leadCode}: ${title}`,
      body: cr.resource
        ? `Resource: ${cr.resource.title}`
        : "No SharePoint resource mapped yet",
      priority: "High",
    });
  }

  // Optional auto follow-up
  if (body.createFollowUp) {
    const count = await prisma.followUp.count({ where: { leadId } });
    await prisma.followUp.create({
      data: {
        leadId,
        followUpNumber: count + 1,
        ownerId: lead.ownerId ?? user.id,
        dueAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        status: "Pending",
        notes: `Follow up on ${title}`,
      },
    });
  }

  return NextResponse.json(cr);
}

export async function PATCH(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const id = String(body.id ?? "");
  const cr = await prisma.clientRequest.findUnique({
    where: { id },
    include: { lead: true, resource: true },
  });
  if (!cr) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const action = String(body.action ?? "update");

  if (action === "mark_sent") {
    const updated = await prisma.clientRequest.update({
      where: { id },
      data: {
        status: "Sent",
        sentAt: new Date(),
        sentById: user.id,
      },
      include: { resource: true },
    });

    await logActivity({
      leadId: cr.leadId,
      userId: user.id,
      activityType: "Proposal",
      title: `Marked sent: ${cr.title}`,
      detail: cr.resource?.sharePointUrl ?? null,
    });

    // Auto follow-up after send
    const count = await prisma.followUp.count({ where: { leadId: cr.leadId } });
    await prisma.followUp.create({
      data: {
        leadId: cr.leadId,
        followUpNumber: count + 1,
        ownerId: cr.ownerId ?? user.id,
        dueAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        status: "Pending",
        notes: `Follow up after sending ${cr.title}`,
      },
    });

    return NextResponse.json(updated);
  }

  const updated = await prisma.clientRequest.update({
    where: { id },
    data: {
      status: body.status != null ? String(body.status) : cr.status,
      notes: body.notes != null ? String(body.notes) : cr.notes,
    },
  });
  return NextResponse.json(updated);
}
