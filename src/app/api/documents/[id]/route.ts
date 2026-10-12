import { NextResponse } from "next/server";
import { unlink } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/db";
import { getSessionUser, isManagerRole, isMongoObjectId } from "@/lib/auth";

export const runtime = "nodejs";

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  if (!isMongoObjectId(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const doc = await prisma.document.findFirst({
    where: { id, isDeleted: false },
    include: { lead: true },
  });
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const allowed =
    isManagerRole(user.role) ||
    doc.uploadedById === user.id ||
    doc.lead?.ownerId === user.id;
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.document.update({
    where: { id },
    data: { isDeleted: true },
  });

  if (doc.storagePath) {
    try {
      await unlink(path.join(process.cwd(), "uploads", doc.storagePath));
    } catch {
      // file may already be gone
    }
  }

  return NextResponse.json({ ok: true });
}
