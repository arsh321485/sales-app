import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser, isMongoObjectId } from "@/lib/auth";
import { verifyEmailBasic } from "@/lib/research-server";

function str(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s || null;
}

async function handleVerify(body: Record<string, unknown>) {
  const contactIdRaw = str(body.contactId) ?? str(body.id);
  const contactId = contactIdRaw && isMongoObjectId(contactIdRaw) ? contactIdRaw : null;
  if (contactIdRaw && !contactId) {
    return NextResponse.json({ error: "Invalid contactId" }, { status: 400 });
  }

  let contact = null;
  if (contactId) {
    contact = await prisma.contact.findFirst({ where: { id: contactId, isDeleted: false } });
    if (!contact) return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }

  const emailRaw = str(body.email) ?? contact?.email ?? null;
  if (!emailRaw) {
    return NextResponse.json({ error: "email is required" }, { status: 400 });
  }
  const email = emailRaw.toLowerCase();
  const result = await verifyEmailBasic(email);

  let updatedContact = contact;
  if (contactId) {
    updatedContact = await prisma.contact.update({
      where: { id: contactId },
      data: {
        email,
        emailVerificationStatus: result.status,
        emailVerifiedAt: new Date(),
      },
    });
  }

  return NextResponse.json({
    email,
    status: result.status,
    detail: result.detail,
    emailVerificationStatus: result.status,
    contact: updatedContact,
  });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = (await req.json()) as Record<string, unknown>;
    return await handleVerify(body);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Could not verify email" }, { status: 500 });
  }
}

/** PATCH contact status: { contactId, email? } — verifies and persists status. */
export async function PATCH(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const contactIdRaw = str(body.contactId) ?? str(body.id);
    if (!contactIdRaw) {
      // No contact to patch — behave like a plain verification.
      return await handleVerify(body);
    }
    return await handleVerify(body);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Could not verify email" }, { status: 500 });
  }
}
