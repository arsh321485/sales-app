import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser, isManagerRole, isMongoObjectId } from "@/lib/auth";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(
    await prisma.product.findMany({ orderBy: { name: "asc" } }),
  );
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user || !isManagerRole(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const name = String(body.name ?? "").trim();
  const code = String(body.code ?? "").trim().toUpperCase();
  const prefix = String(body.prefix ?? code).trim().toUpperCase();
  if (!name || !code) {
    return NextResponse.json({ error: "Name and code required" }, { status: 400 });
  }
  try {
    const product = await prisma.product.create({
      data: { name, code, prefix, nextNumber: 1 },
    });
    return NextResponse.json(product);
  } catch {
    return NextResponse.json({ error: "Code already exists" }, { status: 409 });
  }
}

export async function PATCH(req: Request) {
  const user = await getSessionUser();
  if (!user || !isManagerRole(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const id = String(body.id ?? "");
  if (!isMongoObjectId(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  return NextResponse.json(
    await prisma.product.update({
      where: { id },
      data: {
        name: body.name != null ? String(body.name).trim() : undefined,
        prefix:
          body.prefix != null
            ? String(body.prefix).trim().toUpperCase()
            : undefined,
        isActive: body.isActive != null ? Boolean(body.isActive) : undefined,
      },
    }),
  );
}

export async function DELETE(req: Request) {
  const user = await getSessionUser();
  if (!user || !isManagerRole(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (!isMongoObjectId(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  const leads = await prisma.lead.count({ where: { productId: id, isDeleted: false } });
  if (leads > 0) {
    return NextResponse.json(
      { error: "Product has leads — deactivate instead" },
      { status: 400 },
    );
  }
  await prisma.product.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
