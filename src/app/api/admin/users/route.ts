import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser, hashPassword, isManagerRole } from "@/lib/auth";
import { DEFAULT_PRODUCTS } from "@/lib/constants";

export async function GET() {
  const user = await getSessionUser();
  if (!user || !isManagerRole(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const users = await prisma.user.findMany({
    include: { team: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    teamId: u.teamId,
    teamName: u.team?.name ?? null,
    isActive: u.isActive,
  })));
}

export async function POST(req: Request) {
  const actor = await getSessionUser();
  if (!actor || !isManagerRole(actor.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const name = String(body.name ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  const role = String(body.role ?? "SalesMember");
  const teamId = String(body.teamId ?? "").trim() || null;

  if (!name || !email || !password || password.length < 8) {
    return NextResponse.json(
      { error: "Name, email and password (min 8) required" },
      { status: 400 },
    );
  }
  if (await prisma.user.findUnique({ where: { email } })) {
    return NextResponse.json({ error: "Email already registered" }, { status: 409 });
  }

  const created = await prisma.user.create({
    data: {
      name,
      email,
      role,
      teamId,
      passwordHash: await hashPassword(password),
    },
  });
  return NextResponse.json({
    id: created.id,
    name: created.name,
    email: created.email,
    role: created.role,
  });
}

/** Seed default 5 products if none exist — not sample leads. */
export async function PUT() {
  const actor = await getSessionUser();
  if (!actor || actor.role !== "SuperAdmin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const count = await prisma.product.count();
  if (count > 0) {
    return NextResponse.json({ message: "Products already exist", count });
  }
  for (const p of DEFAULT_PRODUCTS) {
    await prisma.product.create({
      data: { code: p.code, prefix: p.prefix, name: p.name, nextNumber: 1 },
    });
  }
  return NextResponse.json({ created: DEFAULT_PRODUCTS.length });
}
