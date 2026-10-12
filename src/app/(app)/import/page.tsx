import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { OutreachImportPanel } from "@/components/outreach-import";

export const dynamic = "force-dynamic";

export default async function ImportPage() {
  await requireUser();
  const products = await prisma.product.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <PageHeader
        title="Lead import"
        description="Bulk-import from Sales_Pipeline_Tracker.xlsx — Outreach sheet. Columns auto-map to Lead ID, Product, Company, Contact, and the rest."
      />
      <OutreachImportPanel
        products={products.map((p) => ({
          id: p.id,
          name: p.name,
          code: p.code,
        }))}
      />
    </div>
  );
}
