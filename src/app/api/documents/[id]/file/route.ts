import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const doc = await prisma.document.findFirst({
    where: { id, isDeleted: false },
  });

  if (!doc) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const filePath = path.join(process.cwd(), "uploads", doc.storagePath);
  try {
    const buf = await readFile(filePath);
    return new NextResponse(buf, {
      headers: {
        "Content-Type": doc.mimeType,
        "Content-Disposition": `inline; filename="${doc.fileName.replace(/"/g, "")}"`,
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch {
    return NextResponse.json({ error: "File missing on disk" }, { status: 404 });
  }
}
