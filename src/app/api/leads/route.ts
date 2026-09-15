import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser, isManagerRole } from "@/lib/auth";
import { nextLeadCode, nextOrgCode } from "@/lib/codes";

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const orgName = String(body.orgName ?? "").trim();
    const productId = String(body.productId ?? "");
    const contactName = String(body.contactName ?? "").trim();
    const contactEmail = String(body.contactEmail ?? "").trim() || null;
    const contactPhone = String(body.contactPhone ?? "").trim() || null;
    const contactDesignation = String(body.contactDesignation ?? "").trim() || null;
    const industry = String(body.industry ?? "").trim() || null;
    const city = String(body.city ?? "").trim() || null;
    const state = String(body.state ?? "").trim() || null;
    const source = String(body.source ?? "").trim() || null;
    const icpFit = String(body.icpFit ?? "").trim() || null;
    const triggerEvent = String(body.triggerEvent ?? "").trim() || null;
    const nextAction = String(body.nextAction ?? "Research and qualify").trim();
    const notes = String(body.notes ?? "").trim() || null;

    // Manager can assign to another user; employees own what they create
    let ownerId = user.id;
    if (isManagerRole(user.role) && body.ownerId) {
      ownerId = String(body.ownerId);
    }

    if (!orgName || !productId || !contactName) {
      return NextResponse.json(
        { error: "Company name, product, and contact name are required" },
        { status: 400 },
      );
    }

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product || !product.isActive) {
      return NextResponse.json({ error: "Invalid product" }, { status: 400 });
    }

    const org = await prisma.organization.create({
      data: {
        orgCode: await nextOrgCode(),
        orgName,
        industry,
        city,
        state,
        notes,
        orgStatus: "Prospect",
      },
    });

    const contact = await prisma.contact.create({
      data: {
        organizationId: org.id,
        fullName: contactName,
        email: contactEmail,
        phone: contactPhone,
        designation: contactDesignation,
        isPrimary: true,
        emailVerified: Boolean(contactEmail),
      },
    });

    const lead = await prisma.lead.create({
      data: {
        leadCode: await nextLeadCode(product.code),
        organizationId: org.id,
        productId: product.id,
        primaryContactId: contact.id,
        ownerId,
        currentPhase: 1,
        phaseStatus: "Researching",
        furthestPhaseReached: 1,
        outcome: "Active",
        icpFit,
        triggerEvent,
        nextAction,
        nextActionDate: new Date(),
        research: {
          create: {
            status: "Researching",
            source,
            icpScore: icpFit,
            notes,
          },
        },
        phaseHistory: {
          create: {
            fromPhase: null,
            toPhase: 1,
            toStatus: "Researching",
            changedById: user.id,
            reason: "Lead created",
          },
        },
        activities: {
          create: {
            userId: user.id,
            activityType: "lead_created",
            summary: `Created lead ${orgName}`,
          },
        },
      },
    });

    return NextResponse.json({ id: lead.id, leadCode: lead.leadCode });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Could not create lead" }, { status: 500 });
  }
}
