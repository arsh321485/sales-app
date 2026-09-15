import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser, isManagerRole, isMongoObjectId } from "@/lib/auth";

async function requireManager() {
  const user = await getSessionUser();
  if (!user || !isManagerRole(user.role)) return null;
  return user;
}

export async function GET() {
  if (!(await requireManager())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return NextResponse.json(
    await prisma.master.findMany({
      orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
    }),
  );
}

export async function POST(req: Request) {
  if (!(await requireManager())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const category = String(body.category ?? "").trim();
  const code = String(body.code ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
  const label = String(body.label ?? "").trim();
  const sortOrder = Number(body.sortOrder ?? 0) || 0;
  if (!category || !code || !label) {
    return NextResponse.json(
      { error: "Category, code and label required" },
      { status: 400 },
    );
  }
  try {
    const master = await prisma.master.create({
      data: { category, code, label, sortOrder },
    });
    return NextResponse.json(master);
  } catch {
    return NextResponse.json({ error: "Duplicate category+code" }, { status: 409 });
  }
}

export async function PATCH(req: Request) {
  if (!(await requireManager())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const id = String(body.id ?? "");
  if (!isMongoObjectId(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  const data: {
    label?: string;
    sortOrder?: number;
    isActive?: boolean;
  } = {};
  if (body.label != null) data.label = String(body.label).trim();
  if (body.sortOrder != null) data.sortOrder = Number(body.sortOrder) || 0;
  if (body.isActive != null) data.isActive = Boolean(body.isActive);
  return NextResponse.json(await prisma.master.update({ where: { id }, data }));
}

export async function DELETE(req: Request) {
  if (!(await requireManager())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id") ?? "";
  if (!isMongoObjectId(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  await prisma.master.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
