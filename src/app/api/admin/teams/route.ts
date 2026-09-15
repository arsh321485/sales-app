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
  const teams = await prisma.team.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(teams);
}

export async function POST(req: Request) {
  if (!(await requireManager())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const name = String(body.name ?? "").trim();
  const code = String(body.code ?? "")
    .trim()
    .toUpperCase();
  if (!name || !code) {
    return NextResponse.json({ error: "Name and code required" }, { status: 400 });
  }
  try {
    const team = await prisma.team.create({ data: { name, code } });
    return NextResponse.json(team);
  } catch {
    return NextResponse.json({ error: "Code already exists" }, { status: 409 });
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
  const data: { name?: string; code?: string } = {};
  if (body.name != null) data.name = String(body.name).trim();
  if (body.code != null) data.code = String(body.code).trim().toUpperCase();
  try {
    const team = await prisma.team.update({ where: { id }, data });
    return NextResponse.json(team);
  } catch {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
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
  const members = await prisma.user.count({ where: { teamId: id } });
  if (members > 0) {
    return NextResponse.json(
      { error: `Team has ${members} user(s). Move them first.` },
      { status: 400 },
    );
  }
  await prisma.team.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
