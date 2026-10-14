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
  const sendDateRaw = body.sendDate ?? body.dueAt;
  if (!sendDateRaw) {
    return NextResponse.json(
      { error: "Send date is required (when document was/needs to be sent)" },
      { status: 400 },
    );
  }
  const sendDate = new Date(String(sendDateRaw));
  const followUpAfterDays =
    body.followUpAfterDays != null && String(body.followUpAfterDays) !== ""
      ? Number(body.followUpAfterDays)
      : null;
  if (followUpAfterDays != null && (Number.isNaN(followUpAfterDays) || followUpAfterDays < 0)) {
    return NextResponse.json({ error: "Follow-up days must be a number ≥ 0" }, { status: 400 });
  }

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
      description: String(body.description ?? "").trim() || null,
      status: "Open",
      priority: "High",
      resourceId,
      sendDate,
      dueAt: sendDate,
      followUpAfterDays,
      notes: String(body.notes ?? "").trim() || null,
    },
    include: { resource: true },
  });

  await logActivity({
    leadId,
    userId: user.id,
    activityType: "ClientRequest",
    title: `Client requested: ${title}`,
    detail: body.description ? String(body.description) : null,
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

  if (followUpAfterDays != null && followUpAfterDays > 0) {
    const count = await prisma.followUp.count({ where: { leadId } });
    await prisma.followUp.create({
      data: {
        leadId,
        followUpNumber: count + 1,
        ownerId: lead.ownerId ?? user.id,
        dueAt: new Date(sendDate.getTime() + followUpAfterDays * 24 * 60 * 60 * 1000),
        status: "Pending",
        notes: `Follow up on ${title} if no response (${followUpAfterDays} days)`,
        nextAction: "follow-up",
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
        sendDate: cr.sendDate ?? new Date(),
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

    const days = cr.followUpAfterDays ?? 2;
    if (days > 0) {
      const count = await prisma.followUp.count({ where: { leadId: cr.leadId } });
      await prisma.followUp.create({
        data: {
          leadId: cr.leadId,
          followUpNumber: count + 1,
          ownerId: cr.ownerId ?? user.id,
          dueAt: new Date(Date.now() + days * 24 * 60 * 60 * 1000),
          status: "Pending",
          notes: `Follow up after sending ${cr.title}`,
          nextAction: "follow-up",
        },
      });
    }

    return NextResponse.json(updated);
  }

  const updated = await prisma.clientRequest.update({
    where: { id },
    data: {
      status: body.status != null ? String(body.status) : cr.status,
      notes: body.notes != null ? String(body.notes) : cr.notes,
      description:
        body.description != null ? String(body.description) : cr.description,
      sendDate: body.sendDate ? new Date(String(body.sendDate)) : cr.sendDate,
      followUpAfterDays:
        body.followUpAfterDays != null
          ? Number(body.followUpAfterDays)
          : cr.followUpAfterDays,
    },
  });
  return NextResponse.json(updated);
}
