import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser, isManagerRole } from "@/lib/auth";
import { leadScopeWhere } from "@/lib/scope";
import { PageHeader } from "@/components/ui";
import { LeadsTable } from "@/components/leads-table";

export const dynamic = "force-dynamic";

export default async function LeadsPage() {
  const user = await requireUser();
  const manager = isManagerRole(user.role);

  const [leads, products] = await Promise.all([
    prisma.lead.findMany({
      where: { isDeleted: false, ...leadScopeWhere(user) },
      include: {
        organization: true,
        product: true,
        owner: true,
        contact: true,
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.product.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div>
      <PageHeader
        title={manager ? "All leads" : "My leads"}
        description="Flexible activity-based pipeline — stages move with real work, not forced gates."
        actions={
          <Link
            href="/leads/new"
            className="rounded-md bg-[var(--accent)] px-3 py-2 text-sm font-medium text-white"
          >
            New outreach
          </Link>
        }
      />

      <LeadsTable
        leads={leads.map((lead) => ({
          id: lead.id,
          leadCode: lead.leadCode,
          company: lead.organization.orgName,
          contactName: lead.contact?.fullName ?? null,
          outreachDate: lead.outreachDate?.toISOString() ?? null,
          outreachChannel: lead.outreachChannel,
          outreachOwner: lead.owner?.name ?? null,
          outreachStatus: lead.outreachStatus,
          temperature: lead.temperature,
          nextAction: lead.nextAction,
          nextPhase: lead.nextPhase,
          productId: lead.productId,
          productName: lead.product.name,
        }))}
        products={products.map((p) => ({
          id: p.id,
          name: p.name,
          code: p.code,
        }))}
      />
    </div>
  );
}
