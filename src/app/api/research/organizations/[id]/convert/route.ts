import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser, isManagerRole, isMongoObjectId } from "@/lib/auth";
import { nextLeadCode, logActivity } from "@/lib/leads";
import { isSuppressed } from "@/lib/research-claims";

function str(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s || null;
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { id } = await ctx.params;
    if (!isMongoObjectId(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const org = await prisma.organization.findFirst({ where: { id, isDeleted: false } });
    if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

    const body = (await req.json()) as Record<string, unknown>;
    const contactId = str(body.contactId);
    const productId = str(body.productId);
    if (!contactId || !isMongoObjectId(contactId)) {
      return NextResponse.json({ error: "contactId is required" }, { status: 400 });
    }
    if (!productId || !isMongoObjectId(productId)) {
      return NextResponse.json({ error: "productId is required" }, { status: 400 });
    }

    const contact = await prisma.contact.findFirst({
      where: { id: contactId, organizationId: id, isDeleted: false },
    });
    if (!contact) {
      return NextResponse.json({ error: "Contact not found for this organization" }, { status: 404 });
    }

    const product = await prisma.product.findFirst({ where: { id: productId, isActive: true } });
    if (!product) return NextResponse.json({ error: "Invalid product" }, { status: 400 });

    if (await isSuppressed(contact.email, contact.fullName, org.websiteDomain ?? undefined)) {
      return NextResponse.json({ error: "Contact is suppressed" }, { status: 409 });
    }

    const existing = await prisma.lead.findFirst({
      where: { organizationId: id, productId, contactId, isDeleted: false },
    });
    if (existing) {
      return NextResponse.json({
        id: existing.id,
        leadId: existing.id,
        leadCode: existing.leadCode,
        existing: true,
      });
    }

    const requestedOwner = str(body.ownerId);
    const ownerId =
      requestedOwner && isManagerRole(user.role) && isMongoObjectId(requestedOwner)
        ? requestedOwner
        : user.id;

    if (ownerId !== user.id) {
      const owner = await prisma.user.findFirst({ where: { id: ownerId, isActive: true } });
      if (!owner) return NextResponse.json({ error: "Invalid ownerId" }, { status: 400 });
    }

    const leadCode = await nextLeadCode(productId);
    const now = new Date();
    const lead = await prisma.lead.create({
      data: {
        leadCode,
        organizationId: id,
        productId,
        contactId,
        ownerId,
        salesStage: "New",
        status: "Open",
        source: "Research",
        outreachDate: now,
        outreachChannel: "Research",
        nextAction: "follow-up",
      },
    });

    await logActivity({
      leadId: lead.id,
      userId: user.id,
      activityType: "Other",
      title: "Research conversion",
      detail: `Converted research contact ${contact.fullName} (${org.orgName}) to lead ${leadCode} for ${product.name}`,
    });

    return NextResponse.json(
      { id: lead.id, leadId: lead.id, leadCode: lead.leadCode, lead },
      { status: 201 },
    );
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Could not convert to lead" }, { status: 500 });
  }
}
