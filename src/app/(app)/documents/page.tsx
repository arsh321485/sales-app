import { prisma } from "@/lib/db";
import { DocumentsLibrary } from "@/components/documents-library";
import { requireUser, isManagerRole } from "@/lib/auth";
import { leadScopeWhere } from "@/lib/scope";

export const dynamic = "force-dynamic";

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ preview?: string; leadId?: string }>;
}) {
  const user = await requireUser();
  const manager = isManagerRole(user.role);
  const sp = await searchParams;

  const leadScope = leadScopeWhere(user);

  const [documents, leads] = await Promise.all([
    prisma.document.findMany({
      where: {
        isDeleted: false,
        ...(manager
          ? {}
          : {
              OR: [
                { leadId: null },
                { lead: leadScope },
                { uploadedById: user.id },
              ],
            }),
      },
      include: {
        lead: { include: { organization: true } },
        uploadedBy: true,
      },
      orderBy: { uploadedAt: "desc" },
    }),
    prisma.lead.findMany({
      where: { isDeleted: false, ...leadScope },
      include: { organization: true, product: true },
      orderBy: { leadCode: "asc" },
    }),
  ]);

  return (
    <DocumentsLibrary
      initialPreviewId={sp.preview}
      initialLeadId={sp.leadId}
      leads={leads.map((l) => ({
        id: l.id,
        label: `${l.leadCode} · ${l.organization.orgName} (${l.product.code})`,
      }))}
      documents={documents.map((d) => ({
        id: d.id,
        title: d.title,
        fileName: d.fileName,
        documentType: d.documentType,
        folder: d.folder,
        fileSize: d.fileSize,
        mimeType: d.mimeType,
        versionNo: d.versionNo,
        uploadedAt: d.uploadedAt.toISOString(),
        leadId: d.leadId,
        leadCode: d.lead?.leadCode ?? null,
        orgName: d.lead?.organization.orgName ?? null,
        uploadedBy: d.uploadedBy?.name ?? null,
      }))}
    />
  );
}
