import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser, isMongoObjectId } from "@/lib/auth";
import { addSuppression } from "@/lib/research-claims";
import { normalizeDomain } from "@/lib/research";

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
    const q = url.searchParams.get("q")?.trim() ?? "";
    const where: Record<string, unknown> = {};
    if (q) {
      where.OR = [
        { email: { contains: q, mode: "insensitive" } },
        { reason: { contains: q, mode: "insensitive" } },
        { nameDomainKey: { contains: q, mode: "insensitive" } },
      ];
    }
    const items = await prisma.suppression.findMany({
      where: where as never,
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(items);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Could not list suppressions" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const email = str(body.email);
    const fullName = str(body.fullName) ?? str(body.name);
    const domainRaw = str(body.domain) ?? str(body.websiteDomain);
    const domain = domainRaw ? normalizeDomain(domainRaw) : undefined;
    const reason = str(body.reason);
    if (!reason) return NextResponse.json({ error: "reason is required" }, { status: 400 });
    if (!email && !fullName && !domain) {
      return NextResponse.json(
        { error: "email, fullName, or domain is required" },
        { status: 400 },
      );
    }
    const created = await addSuppression({
      email: email ?? undefined,
      fullName: fullName ?? undefined,
      domain,
      reason,
      jurisdiction: str(body.jurisdiction) ?? undefined,
      createdById: user.id,
    });
    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    console.error(e);
    // Unique emailHash etc.
    const msg = e instanceof Error ? e.message : "";
    if (msg.toLowerCase().includes("unique")) {
      return NextResponse.json({ error: "Suppression already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Could not add suppression" }, { status: 500 });
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
    const existing = await prisma.suppression.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await prisma.suppression.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Could not delete suppression" }, { status: 500 });
  }
}
