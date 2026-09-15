import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  getSessionUser,
  hashPassword,
  isManagerRole,
  isMongoObjectId,
} from "@/lib/auth";

async function requireAdminActor() {
  const actor = await getSessionUser();
  if (!actor || !isManagerRole(actor.role)) return null;
  return actor;
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const actor = await requireAdminActor();
  if (!actor) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await ctx.params;
  if (!isMongoObjectId(id)) {
    return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
  }

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });

  try {
    const body = await req.json();
    const data: {
      name?: string;
      email?: string;
      role?: string;
      teamId?: string | null;
      isActive?: boolean;
      passwordHash?: string;
    } = {};

    if (body.name != null) data.name = String(body.name).trim();
    if (body.email != null) {
      data.email = String(body.email).trim().toLowerCase();
      const clash = await prisma.user.findFirst({
        where: { email: data.email, NOT: { id } },
      });
      if (clash) {
        return NextResponse.json({ error: "Email already in use" }, { status: 409 });
      }
    }
    if (body.role != null) data.role = String(body.role);
    if (body.teamId !== undefined) {
      data.teamId = String(body.teamId ?? "").trim() || null;
    }
    if (body.isActive != null) {
      data.isActive = Boolean(body.isActive);
      if (data.isActive === false && id === actor.id) {
        return NextResponse.json(
          { error: "You cannot deactivate your own account" },
          { status: 400 },
        );
      }
    }
    if (body.password) {
      const password = String(body.password);
      if (password.length < 8) {
        return NextResponse.json(
          { error: "Password must be at least 8 characters" },
          { status: 400 },
        );
      }
      data.passwordHash = await hashPassword(password);
    }

    const updated = await prisma.user.update({
      where: { id },
      data,
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
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const actor = await requireAdminActor();
  if (!actor) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await ctx.params;
  if (!isMongoObjectId(id)) {
    return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
  }

  if (id === actor.id) {
    return NextResponse.json(
      { error: "You cannot delete your own account" },
      { status: 400 },
    );
  }

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });

  if (target.role === "Admin") {
    const adminCount = await prisma.user.count({
      where: { role: "Admin", isActive: true },
    });
    if (adminCount <= 1) {
      return NextResponse.json(
        { error: "Cannot delete the last active Admin" },
        { status: 400 },
      );
    }
  }

  const activeLeads = await prisma.lead.count({
    where: { ownerId: id, outcome: "Active", isDeleted: false },
  });
  if (activeLeads > 0) {
    return NextResponse.json(
      {
        error: `User owns ${activeLeads} active lead(s). Reassign or close them first, or deactivate instead.`,
      },
      { status: 400 },
    );
  }

  try {
    await prisma.lead.updateMany({
      where: { ownerId: id },
      data: { ownerId: null },
    });
    await prisma.meeting.updateMany({
      where: { ownerId: id },
      data: { ownerId: null },
    });
    await prisma.demo.updateMany({
      where: { prepOwnerId: id },
      data: { prepOwnerId: null },
    });
    await prisma.demo.updateMany({
      where: { conductedById: id },
      data: { conductedById: null },
    });
    await prisma.document.updateMany({
      where: { uploadedById: id },
      data: { uploadedById: null },
    });
    await prisma.phaseHistory.updateMany({
      where: { changedById: id },
      data: { changedById: null },
    });
    await prisma.activityLog.updateMany({
      where: { userId: id },
      data: { userId: null },
    });
    await prisma.notification.deleteMany({ where: { userId: id } });

    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
