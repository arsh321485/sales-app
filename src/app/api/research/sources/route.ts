import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser, isManagerRole, isMongoObjectId } from "@/lib/auth";
import { DEFAULT_SOURCES } from "@/lib/research";

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

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const items = await prisma.researchSource.findMany({ orderBy: { name: "asc" } });
    if (items.length === 0) {
      const virtual = DEFAULT_SOURCES.map((s) => ({
        id: null,
        name: s.name,
        category: s.category,
        fieldsSupplied: s.fieldsSupplied,
        licence: s.licence,
        allowedUses: null,
        personalData: s.personalData,
        refreshCadence: s.refreshCadence,
        isActive: true,
        notes: null,
        createdAt: null,
        updatedAt: null,
      }));
      return NextResponse.json(virtual);
    }
    return NextResponse.json(items);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Could not list sources" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isManagerRole(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const name = str(body.name);
    const category = str(body.category);
    if (!name || !category) {
      return NextResponse.json({ error: "name and category are required" }, { status: 400 });
    }
    const dup = await prisma.researchSource.findFirst({ where: { name } });
    if (dup) return NextResponse.json({ error: "Source with this name already exists" }, { status: 409 });

    const created = await prisma.researchSource.create({
      data: {
        name,
        category,
        fieldsSupplied: str(body.fieldsSupplied),
        licence: str(body.licence),
        allowedUses: str(body.allowedUses),
        personalData: boolVal(body.personalData) ?? false,
        refreshCadence: str(body.refreshCadence),
        isActive: boolVal(body.isActive) ?? true,
        notes: str(body.notes),
      },
    });
    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Could not create source" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isManagerRole(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const id = str(body.id);
    if (!id || !isMongoObjectId(id)) {
      return NextResponse.json({ error: "Valid source id is required" }, { status: 400 });
    }
    const existing = await prisma.researchSource.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (body.name !== undefined) {
      const name = str(body.name);
      if (!name) return NextResponse.json({ error: "name cannot be empty" }, { status: 400 });
      const dup = await prisma.researchSource.findFirst({ where: { name, id: { not: id } } });
      if (dup) return NextResponse.json({ error: "Source with this name already exists" }, { status: 409 });
    }
    if (body.category !== undefined && !str(body.category)) {
      return NextResponse.json({ error: "category cannot be empty" }, { status: 400 });
    }

    const updated = await prisma.researchSource.update({
      where: { id },
      data: {
        name: body.name !== undefined ? (str(body.name) ?? undefined) : undefined,
        category: body.category !== undefined ? (str(body.category) ?? undefined) : undefined,
        fieldsSupplied: body.fieldsSupplied !== undefined ? str(body.fieldsSupplied) : undefined,
        licence: body.licence !== undefined ? str(body.licence) : undefined,
        allowedUses: body.allowedUses !== undefined ? str(body.allowedUses) : undefined,
        personalData: boolVal(body.personalData),
        refreshCadence: body.refreshCadence !== undefined ? str(body.refreshCadence) : undefined,
        isActive: boolVal(body.isActive),
        notes: body.notes !== undefined ? str(body.notes) : undefined,
      },
    });
    return NextResponse.json(updated);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Could not update source" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isManagerRole(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id")?.trim() ?? "";
    if (!id || !isMongoObjectId(id)) {
      return NextResponse.json({ error: "Valid ?id= is required" }, { status: 400 });
    }
    const existing = await prisma.researchSource.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await prisma.researchSource.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Could not delete source" }, { status: 500 });
  }
}
