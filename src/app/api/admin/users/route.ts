import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser, hashPassword, isManagerRole } from "@/lib/auth";
import type { UserLite } from "@/types/models";

export async function GET() {
  const user = await getSessionUser();
  if (!user || !isManagerRole(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const users = await prisma.user.findMany({
    include: { team: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(
    (users as UserLite[]).map((u: UserLite) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      teamId: u.teamId,
      teamName: u.team?.name ?? null,
      isActive: u.isActive,
      createdAt: u.createdAt,
    })),
  );
}

export async function POST(req: Request) {
  const actor = await getSessionUser();
  if (!actor || !isManagerRole(actor.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const name = String(body.name ?? "").trim();
    const email = String(body.email ?? "")
      .trim()
      .toLowerCase();
    const password = String(body.password ?? "");
    const role = String(body.role ?? "Outreach");
    const teamId = String(body.teamId ?? "").trim() || null;

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Name, email and password are required" },
        { status: 400 },
      );
    }
    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 },
      );
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
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
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Could not create user" }, { status: 500 });
  }
}
