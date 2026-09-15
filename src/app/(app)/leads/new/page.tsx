import { prisma } from "@/lib/db";
import { requireUser, isManagerRole } from "@/lib/auth";
import { NewLeadForm } from "@/components/new-lead-form";
import { PageHeader } from "@/components/ui";
import type { ProductLite, UserLite } from "@/types/models";

export const dynamic = "force-dynamic";

export default async function NewLeadPage() {
  const user = await requireUser();
  const [products, users] = await Promise.all([
    prisma.product.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    isManagerRole(user.role)
      ? prisma.user.findMany({
          where: { isActive: true, role: { not: "Admin" } },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([] as UserLite[]),
  ]);

  return (
    <div>
      <PageHeader
        title="New lead"
        description="Create a company + primary contact + product lead. It starts in Phase 1 (Research) on your queue."
      />
      <NewLeadForm
        products={(products as ProductLite[]).map((p: ProductLite) => ({
          id: p.id,
          name: p.name,
          code: p.code,
        }))}
        assignableUsers={(users as UserLite[]).map((u: UserLite) => ({
          id: u.id,
          name: u.name,
          role: u.role,
        }))}
        isManager={isManagerRole(user.role)}
      />
    </div>
  );
}
