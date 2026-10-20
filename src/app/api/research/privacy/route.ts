import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser, isMongoObjectId } from "@/lib/auth";
import { addSuppression, isSuppressed } from "@/lib/research-claims";

const EVENT_TYPES = ["Notice", "Objection", "Access", "Erasure", "Correction"] as const;

function str(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s || null;
}

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const url = new URL(req.url);
    const status = url.searchParams.get("status")?.trim() ?? "";
    const eventType = url.searchParams.get("eventType")?.trim() ?? "";
    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (eventType) where.eventType = eventType;
    const items = await prisma.privacyEvent.findMany({
      where: where as never,
      orderBy: { receivedAt: "desc" },
    });
    return NextResponse.json(items);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Could not list privacy events" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const eventType = str(body.eventType);
    if (!eventType || !(EVENT_TYPES as readonly string[]).includes(eventType)) {
      return NextResponse.json(
        { error: `eventType must be one of: ${EVENT_TYPES.join(", ")}` },
        { status: 400 },
      );
    }
    const personEmailRaw = str(body.personEmail) ?? str(body.email);
    const personEmail = personEmailRaw ? personEmailRaw.toLowerCase() : null;
    const contactIdRaw = str(body.contactId);
    const contactId = contactIdRaw && isMongoObjectId(contactIdRaw) ? contactIdRaw : null;
    if (contactIdRaw && !contactId) {
      return NextResponse.json({ error: "Invalid contactId" }, { status: 400 });
    }

    let contactFullName: string | undefined;
    let contactDomain: string | undefined;
    if (contactId) {
      const contact = await prisma.contact.findFirst({
        where: { id: contactId, isDeleted: false },
        include: { organization: true },
      });
      if (!contact) return NextResponse.json({ error: "Contact not found" }, { status: 404 });
      contactFullName = contact.fullName;
      contactDomain = contact.organization.websiteDomain ?? undefined;
    }

    const event = await prisma.privacyEvent.create({
      data: {
        eventType,
        personEmail,
        contactId,
        notes: str(body.notes),
        status: "Open",
        receivedAt: body.receivedAt ? new Date(String(body.receivedAt)) : new Date(),
        handlerId: user.id,
      },
    });

    let suppression = null;
    if ((eventType === "Erasure" || eventType === "Objection") && personEmail) {
      try {
        const already = await isSuppressed(personEmail, contactFullName, contactDomain);
        if (!already) {
          suppression = await addSuppression({
            email: personEmail,
            fullName: contactFullName,
            domain: contactDomain,
            reason: `Privacy: ${eventType}`,
            jurisdiction: str(body.jurisdiction) ?? undefined,
            createdById: user.id,
          });
        }
      } catch (suppErr) {
        // Duplicate emailHash etc. — event is already recorded, don't fail the request
        console.error(suppErr);
      }
    }

    return NextResponse.json({ ...event, suppression }, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Could not create privacy event" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const id = str(body.id);
    if (!id || !isMongoObjectId(id)) {
      return NextResponse.json({ error: "Valid event id is required" }, { status: 400 });
    }
    const existing = await prisma.privacyEvent.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const updated = await prisma.privacyEvent.update({
      where: { id },
      data: {
        status: "Completed",
        completedAt: new Date(),
        handlerId: user.id,
        ...(body.notes !== undefined ? { notes: str(body.notes) } : {}),
      },
    });
    return NextResponse.json(updated);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Could not complete privacy event" }, { status: 500 });
  }
}
