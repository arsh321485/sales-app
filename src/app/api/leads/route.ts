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
    const orgName = String(body.orgName ?? "").trim();
    const productId = String(body.productId ?? "");
    const contactName = String(body.contactName ?? "").trim();
    if (!orgName || !productId || !contactName) {
      return NextResponse.json(
        { error: "Company, product and contact name are required" },
        { status: 400 },
      );
    }

    const product = await prisma.product.findFirst({
      where: { id: productId, isActive: true },
    });
    if (!product) {
      return NextResponse.json({ error: "Invalid product" }, { status: 400 });
    }

    let ownerId = user.id;
    if (isManagerRole(user.role) && body.ownerId) {
      ownerId = String(body.ownerId);
    }

    const leadCode = await nextLeadCode(productId);

    const org = await prisma.organization.create({
      data: {
        orgName,
        industry: String(body.industry ?? "").trim() || null,
        city: String(body.city ?? "").trim() || null,
        state: String(body.state ?? "").trim() || null,
        websiteDomain: String(body.websiteDomain ?? "").trim() || null,
        notes: String(body.notes ?? "").trim() || null,
      },
    });

    const contact = await prisma.contact.create({
      data: {
        organizationId: org.id,
        fullName: contactName,
        designation: String(body.designation ?? "").trim() || null,
        email: String(body.contactEmail ?? "").trim() || null,
        phone: String(body.contactPhone ?? "").trim() || null,
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
        salesStage: "New",
        source: String(body.source ?? "Manual").trim() || "Manual",
        campaign: String(body.campaign ?? "").trim() || null,
        nextAction: String(body.nextAction ?? "Qualify lead").trim(),
        nextFollowUpAt: body.nextFollowUpAt
          ? new Date(String(body.nextFollowUpAt))
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
