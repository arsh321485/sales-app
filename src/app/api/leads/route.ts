import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser, isManagerRole } from "@/lib/auth";
import { nextLeadCode, logActivity, notify } from "@/lib/leads";
import { leadScopeWhere } from "@/lib/scope";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const leads = await prisma.lead.findMany({
    where: { isDeleted: false, ...leadScopeWhere(user) },
    include: {
      organization: true,
      product: true,
      contact: true,
      owner: true,
    },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json(leads);
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const orgName = String(body.orgName ?? "").trim() || "Unknown company";
    const productId = String(body.productId ?? "");
    const contactName = String(body.contactName ?? "").trim() || "Unknown contact";
    if (!productId) {
      return NextResponse.json({ error: "Product is required" }, { status: 400 });
    }

    const product = await prisma.product.findFirst({
      where: { id: productId, isActive: true },
    });
    if (!product) {
      return NextResponse.json({ error: "Invalid product" }, { status: 400 });
    }

    let ownerId = user.id;
    if (body.ownerId && (isManagerRole(user.role) || String(body.ownerId) === user.id)) {
      ownerId = String(body.ownerId);
    }

    const leadCode =
      String(body.leadCode ?? "").trim() || (await nextLeadCode(productId));
    if (body.leadCode) {
      const exists = await prisma.lead.findFirst({ where: { leadCode } });
      if (exists) {
        return NextResponse.json({ error: `Lead ID ${leadCode} already exists` }, { status: 409 });
      }
    }

    const geography = String(body.geography ?? "").trim();
    const location = String(body.location ?? body.city ?? "").trim();
    const country = geography
      ? geography.split("/")[0]?.trim() || geography
      : String(body.country ?? "India").trim() || "India";

    const outreachDate = body.outreachDate
      ? new Date(String(body.outreachDate))
      : new Date();

    const org = await prisma.organization.create({
      data: {
        orgName,
        industry: String(body.industry ?? "").trim() || null,
        city: location.split(",")[0]?.trim() || location || null,
        state: String(body.state ?? "").trim() || null,
        country,
        websiteDomain: String(body.websiteDomain ?? "").trim() || null,
        notes: location || null,
      },
    });

    const contact = await prisma.contact.create({
      data: {
        organizationId: org.id,
        fullName: contactName,
        designation: String(body.designation ?? "").trim() || null,
        email: String(body.contactEmail ?? body.email ?? "").trim() || null,
        phone: String(body.contactPhone ?? body.phone ?? "").trim() || null,
        linkedinUrl: String(body.linkedinUrl ?? "").trim() || null,
      },
    });

    const lead = await prisma.lead.create({
      data: {
        leadCode,
        organizationId: org.id,
        productId,
        contactId: contact.id,
        ownerId,
        salesStage: String(body.salesStage ?? body.pipelineStatus ?? "New").trim() || "New",
        temperature: String(body.temperature ?? "").trim() || null,
        qualification: String(body.qualification ?? "").trim() || null,
        source: String(body.source ?? body.outreachChannel ?? "Manual").trim() || "Manual",
        campaign: String(body.campaign ?? "").trim() || null,
        nextAction: String(body.nextAction ?? "follow-up").trim() || "follow-up",
        nextFollowUpAt: body.nextFollowUpAt || body.nextActionDate
          ? new Date(String(body.nextFollowUpAt ?? body.nextActionDate))
          : null,
        nextPhase: String(body.nextPhase ?? "").trim() || null,
        outreachDate,
        outreachChannel: String(body.outreachChannel ?? "").trim() || null,
        outreachStatus: String(body.outreachStatus ?? "").trim() || null,
        responseStatus: String(body.responseStatus ?? "").trim() || null,
        lastReplyDate: body.lastReplyDate
          ? new Date(String(body.lastReplyDate))
          : null,
        notes: String(body.notes ?? "").trim() || null,
      },
    });

    await logActivity({
      leadId: lead.id,
      userId: user.id,
      activityType: "Outreach",
      title: `Outreach created — ${leadCode}`,
      detail: `Channel: ${body.outreachChannel ?? "Manual"}`,
      occurredAt: outreachDate,
    });

    if (ownerId !== user.id) {
      await notify({
        userId: ownerId,
        leadId: lead.id,
        eventType: "lead_assigned",
        title: `New lead assigned: ${leadCode}`,
        body: orgName,
        priority: "Medium",
      });
    }

    return NextResponse.json({ id: lead.id, leadCode: lead.leadCode });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Could not create lead" }, { status: 500 });
  }
}
