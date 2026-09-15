import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const form = await req.formData();
    const file = form.get("file");
    const title = String(form.get("title") ?? "").trim();
    const documentType = String(form.get("documentType") ?? "Other");
    const folder = String(form.get("folder") ?? "").trim() || null;
    const leadIdRaw = String(form.get("leadId") ?? "").trim();
    const leadId = leadIdRaw || null;

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "File is required" }, { status: 400 });
    }
    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const safeBase = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storageName = `${Date.now()}-${randomUUID().slice(0, 8)}-${safeBase}`;
    const uploadsDir = path.join(process.cwd(), "uploads");
    await mkdir(uploadsDir, { recursive: true });
    await writeFile(path.join(uploadsDir, storageName), bytes);

    const doc = await prisma.document.create({
      data: {
        title,
        documentType,
        folder,
        leadId,
        fileName: file.name,
        storagePath: storageName,
        fileSize: bytes.length,
        mimeType: file.type || "application/octet-stream",
        uploadedById: user.id,
      },
      include: {
        lead: { include: { organization: true } },
        uploadedBy: true,
      },
    });

    if (leadId) {
      await prisma.activityLog.create({
        data: {
          leadId,
          userId: user.id,
          activityType: "document_upload",
          summary: `Uploaded ${documentType}: ${title}`,
        },
      });
    }

    return NextResponse.json({
      id: doc.id,
      title: doc.title,
      fileName: doc.fileName,
      documentType: doc.documentType,
      folder: doc.folder,
      fileSize: doc.fileSize,
      mimeType: doc.mimeType,
      versionNo: doc.versionNo,
      uploadedAt: doc.uploadedAt.toISOString(),
      leadId: doc.leadId,
      leadCode: doc.lead?.leadCode ?? null,
      orgName: doc.lead?.organization.orgName ?? null,
      uploadedBy: doc.uploadedBy?.name ?? null,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
