import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { logActivity } from "@/lib/leads";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const form = await req.formData();
    const file = form.get("file");
    const title = String(form.get("title") ?? "").trim();
    const documentType = String(form.get("documentType") ?? "Other");
    const leadIdRaw = String(form.get("leadId") ?? "").trim();
    const leadId = leadIdRaw || null;
    const sharePointUrl = String(form.get("sharePointUrl") ?? "").trim() || null;

    if (!(file instanceof File) && !sharePointUrl) {
      return NextResponse.json(
        { error: "File or SharePoint URL is required" },
        { status: 400 },
      );
    }
    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    let storageName: string | null = null;
    let fileName: string | null = null;
    let fileSize: number | null = null;
    let mimeType: string | null = null;

    if (file instanceof File && file.size > 0) {
      const bytes = Buffer.from(await file.arrayBuffer());
      const safeBase = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      storageName = `${Date.now()}-${randomUUID().slice(0, 8)}-${safeBase}`;
      const uploadsDir = path.join(process.cwd(), "uploads");
      await mkdir(uploadsDir, { recursive: true });
      await writeFile(path.join(uploadsDir, storageName), bytes);
      fileName = file.name;
      fileSize = bytes.length;
      mimeType = file.type || "application/octet-stream";
    }

    const doc = await prisma.document.create({
      data: {
        title,
        documentType,
        leadId,
        fileName,
        storagePath: storageName,
        sharePointUrl,
        fileSize,
        mimeType,
        uploadedById: user.id,
      },
      include: {
        lead: { include: { organization: true } },
        uploadedBy: true,
      },
    });

    if (leadId) {
      await logActivity({
        leadId,
        userId: user.id,
        activityType: "Other",
        title: `Document: ${title}`,
        detail: documentType,
      });
    }

    return NextResponse.json({
      id: doc.id,
      title: doc.title,
      fileName: doc.fileName,
      documentType: doc.documentType,
      fileSize: doc.fileSize,
      mimeType: doc.mimeType,
      sharePointUrl: doc.sharePointUrl,
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
