import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser, isManagerRole, isMongoObjectId, hashPassword } from "@/lib/auth";

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const actor = await getSessionUser();
  if (!actor || !isManagerRole(actor.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await ctx.params;
  if (!isMongoObjectId(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (body.name != null) data.name = String(body.name).trim();
  if (body.email != null) data.email = String(body.email).trim().toLowerCase();
  if (body.role != null) data.role = String(body.role);
  if (body.teamId !== undefined) data.teamId = String(body.teamId || "") || null;
  if (body.isActive != null) {
    if (id === actor.id && !body.isActive) {
      return NextResponse.json({ error: "Cannot deactivate yourself" }, { status: 400 });
    }
    data.isActive = Boolean(body.isActive);
  }
  if (body.password) {
    if (String(body.password).length < 8) {
      return NextResponse.json({ error: "Password min 8 chars" }, { status: 400 });
    }
    data.passwordHash = await hashPassword(String(body.password));
  }
  const updated = await prisma.user.update({
    where: { id },
    data: data as never,
    include: { team: true },
  });
  return NextResponse.json({
    id: updated.id,
    name: updated.name,
    email: updated.email,
    role: updated.role,
    teamId: updated.teamId,
    teamName: updated.team?.name ?? null,
    isActive: updated.isActive,
  });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const actor = await getSessionUser();
  if (!actor || !isManagerRole(actor.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await ctx.params;
  if (id === actor.id) {
    return NextResponse.json({ error: "Cannot delete yourself" }, { status: 400 });
  }
  const active = await prisma.lead.count({
    where: { ownerId: id, isDeleted: false, status: "Open" },
  });
  if (active > 0) {
    return NextResponse.json(
      { error: `User owns ${active} open lead(s). Reassign first.` },
      { status: 400 },
    );
  }
  await prisma.lead.updateMany({ where: { ownerId: id }, data: { ownerId: null } });
  await prisma.notification.deleteMany({ where: { userId: id } });
  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
