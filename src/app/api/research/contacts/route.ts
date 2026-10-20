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

export async function PATCH(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const id = str(body.id) ?? str(body.contactId);
    if (!id || !isMongoObjectId(id)) {
      return NextResponse.json({ error: "Valid contact id is required" }, { status: 400 });
    }
    const existing = await prisma.contact.findFirst({
      where: { id, isDeleted: false },
      include: { organization: true },
    });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const fullName = body.fullName !== undefined ? str(body.fullName) : existing.fullName;
    if (!fullName) {
      return NextResponse.json({ error: "fullName cannot be empty" }, { status: 400 });
    }
    const emailRaw = body.email !== undefined ? str(body.email) : existing.email;
    const email = emailRaw ? emailRaw.toLowerCase() : null;
    const domain = existing.organization.websiteDomain ?? undefined;

    if (await isSuppressed(email, fullName, domain)) {
      return NextResponse.json({ error: "Contact is suppressed" }, { status: 409 });
    }
    if (email && isPersonalEmail(email)) {
      return NextResponse.json({ error: "Personal email addresses are not allowed" }, { status: 400 });
    }

    const designation = body.designation !== undefined ? str(body.designation) : existing.designation;
    let department = body.department !== undefined ? str(body.department) : existing.department;
    let seniority = body.seniority !== undefined ? str(body.seniority) : existing.seniority;
    const designationChanged = body.designation !== undefined && designation !== existing.designation;
    if (designation && (designationChanged || !department || !seniority)) {
      // Reclassify when the title changed and caller didn't explicitly supply values;
      // also fill gaps on older records.
      if (designationChanged && body.department === undefined && body.seniority === undefined) {
        const classified = classifyTitle(designation);
        department = classified.department;
        seniority = classified.seniority;
      } else {
        const classified = classifyTitle(designation);
        if (body.department === undefined && designationChanged) department = classified.department;
        else if (!department) department = classified.department;
        if (body.seniority === undefined && designationChanged) seniority = classified.seniority;
        else if (!seniority) seniority = classified.seniority;
      }
    }

    const suppliedStatus =
      str(body.emailVerificationStatus) ?? str(body.emailStatus) ?? str(body.status);
    let emailVerificationStatus: string | null | undefined;
    let emailVerifiedAt: Date | null | undefined;
    if (suppliedStatus !== null) {
      emailVerificationStatus = suppliedStatus;
      emailVerifiedAt = body.emailVerifiedAt ? new Date(String(body.emailVerifiedAt)) : new Date();
    } else if (email && email !== existing.email) {
      const result = await verifyEmailBasic(email);
      emailVerificationStatus = result.status;
      emailVerifiedAt = new Date();
    }
    if (!email) {
      emailVerificationStatus = null;
      emailVerifiedAt = null;
    }

    const emailOriginRaw = body.emailOrigin !== undefined ? str(body.emailOrigin) : undefined;
    const phone =
      body.phone !== undefined ? str(body.phone) : body.contactPhone !== undefined ? str(body.contactPhone) : undefined;

    const updated = await prisma.contact.update({
      where: { id },
      data: {
        fullName,
        designation,
        department,
        seniority,
        contactCity:
          body.contactCity !== undefined ? str(body.contactCity) : body.city !== undefined ? str(body.city) : undefined,
        contactCountry:
          body.contactCountry !== undefined
            ? str(body.contactCountry)
            : body.country !== undefined
              ? str(body.country)
              : undefined,
        email,
        ...(emailVerificationStatus !== undefined ? { emailVerificationStatus } : {}),
        ...(emailVerifiedAt !== undefined ? { emailVerifiedAt } : {}),
        ...(emailOriginRaw !== undefined ? { emailOrigin: emailOriginRaw } : {}),
        ...(phone !== undefined ? { phone } : {}),
        linkedinUrl: body.linkedinUrl !== undefined ? str(body.linkedinUrl) : undefined,
        sourceUrl: body.sourceUrl !== undefined ? str(body.sourceUrl) : undefined,
        isPrimary: boolVal(body.isPrimary),
        isCurrent: boolVal(body.isCurrent),
        ...(body.lastSeenAt !== undefined
          ? { lastSeenAt: body.lastSeenAt ? new Date(String(body.lastSeenAt)) : null }
          : {}),
      },
    });

    const claimFields: Array<{ field: string; value: unknown }> = [
      { field: "fullName", value: updated.fullName },
      { field: "designation", value: updated.designation },
      { field: "department", value: updated.department },
      { field: "seniority", value: updated.seniority },
      { field: "contactCity", value: updated.contactCity },
      { field: "contactCountry", value: updated.contactCountry },
      { field: "email", value: updated.email },
      { field: "phone", value: updated.phone },
      { field: "linkedinUrl", value: updated.linkedinUrl },
    ];
    // Only claim fields the caller actually touched (or that reclassification changed)
    const touched = new Set(Object.keys(body));
    const inputs: ClaimInput[] = claimFields
      .filter(
        (c) =>
          c.value != null &&
          String(c.value).trim() !== "" &&
          (touched.has(c.field) ||
            (c.field === "department" && (touched.has("designation") || touched.has("department"))) ||
            (c.field === "seniority" && (touched.has("designation") || touched.has("seniority"))) ||
            (c.field === "phone" && touched.has("contactPhone")) ||
            (c.field === "contactCity" && touched.has("city")) ||
            (c.field === "contactCountry" && touched.has("country"))),
      )
      .map((c) => ({
        entityType: "contact",
        entityId: id,
        field: c.field,
        value: String(c.value),
        sourceName: "Manual entry",
        sourceUrl: str(body.sourceUrl),
        method: "human",
        confidence: 0.95,
        createdById: user.id,
      }));
    if (inputs.length) await recordClaims(inputs);

    return NextResponse.json(updated);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Could not update contact" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id")?.trim() ?? "";
    if (!id || !isMongoObjectId(id)) {
      return NextResponse.json({ error: "Valid ?id= is required" }, { status: 400 });
    }
    const existing = await prisma.contact.findFirst({ where: { id, isDeleted: false } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await prisma.contact.update({ where: { id }, data: { isDeleted: true } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Could not delete contact" }, { status: 500 });
  }
}
