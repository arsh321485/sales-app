import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser, isMongoObjectId } from "@/lib/auth";
import { classifyTitle, isPersonalEmail } from "@/lib/research";
import { verifyEmailBasic } from "@/lib/research-server";
import { isSuppressed, recordClaims, type ClaimInput } from "@/lib/research-claims";

function str(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s || null;
}

function boolVal(v: unknown): boolean | undefined {
  if (typeof v === "boolean") return v;
  if (v === "true") return true;
  if (v === "false") return false;
  return undefined;
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
    const fullName = str(body.fullName);
    if (!fullName) {
      return NextResponse.json({ error: "fullName is required" }, { status: 400 });
    }

    const emailRaw = str(body.email);
    const email = emailRaw ? emailRaw.toLowerCase() : null;

    if (await isSuppressed(email, fullName, org.websiteDomain ?? undefined)) {
      return NextResponse.json({ error: "Contact is suppressed" }, { status: 409 });
    }
    if (email && isPersonalEmail(email)) {
      return NextResponse.json({ error: "Personal email addresses are not allowed" }, { status: 400 });
    }

    const designation = str(body.designation);
    let department = str(body.department);
    let seniority = str(body.seniority);
    if ((!department || !seniority) && designation) {
      const classified = classifyTitle(designation);
      department = department ?? classified.department;
      seniority = seniority ?? classified.seniority;
    }

    const suppliedStatus =
      str(body.emailVerificationStatus) ?? str(body.emailStatus) ?? str(body.status);
    let emailVerificationStatus: string | null = suppliedStatus;
    let emailVerifiedAt: Date | null = body.emailVerifiedAt
      ? new Date(String(body.emailVerifiedAt))
      : null;
    if (email && !suppliedStatus) {
      const result = await verifyEmailBasic(email);
      emailVerificationStatus = result.status;
      emailVerifiedAt = new Date();
    } else if (email && suppliedStatus && !emailVerifiedAt) {
      emailVerifiedAt = new Date();
    }
    if (!email) {
      emailVerificationStatus = suppliedStatus;
      emailVerifiedAt = null;
    }

    const emailOriginRaw = str(body.emailOrigin);
    const emailOrigin =
      emailOriginRaw && ["published", "inferred", "feed"].includes(emailOriginRaw.toLowerCase())
        ? emailOriginRaw.toLowerCase()
        : emailOriginRaw;

    // Phone is stored as the existing Contact.phone field. Callers should only
    // pass public business numbers (optionally flagged phoneType:"business");
    // we accept what is supplied rather than inventing a personal-number check.
    const phone = str(body.phone) ?? str(body.contactPhone);

    const contact = await prisma.contact.create({
      data: {
        organizationId: id,
        fullName,
        designation,
        department,
        seniority,
        contactCity: str(body.contactCity) ?? str(body.city),
        contactCountry: str(body.contactCountry) ?? str(body.country),
        email,
        emailVerificationStatus,
        emailVerifiedAt,
        emailOrigin,
        phone,
        linkedinUrl: str(body.linkedinUrl),
        sourceUrl: str(body.sourceUrl),
        isPrimary: boolVal(body.isPrimary) ?? true,
        isCurrent: boolVal(body.isCurrent) ?? true,
        lastSeenAt: body.lastSeenAt ? new Date(String(body.lastSeenAt)) : new Date(),
      },
    });

    const claimFields: Array<{ field: string; value: unknown }> = [
      { field: "fullName", value: fullName },
      { field: "designation", value: designation },
      { field: "department", value: department },
      { field: "seniority", value: seniority },
      { field: "contactCity", value: contact.contactCity },
      { field: "contactCountry", value: contact.contactCountry },
      { field: "email", value: email },
      { field: "phone", value: phone },
      { field: "linkedinUrl", value: contact.linkedinUrl },
    ];
    const inputs: ClaimInput[] = claimFields
      .filter((c) => c.value != null && String(c.value).trim() !== "")
      .map((c) => ({
        entityType: "contact",
        entityId: contact.id,
        field: c.field,
        value: String(c.value),
        sourceName: "Manual entry",
        sourceUrl: str(body.sourceUrl),
        method: "human",
        confidence: 0.95,
        createdById: user.id,
      }));
    if (inputs.length) await recordClaims(inputs);

    return NextResponse.json(contact, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Could not create contact" }, { status: 500 });
  }
}
