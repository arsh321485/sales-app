import { prisma } from "@/lib/db";
import { requireUser, isManagerRole } from "@/lib/auth";
import { NewLeadForm } from "@/components/new-lead-form";
import { PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function NewLeadPage() {
  const user = await requireUser();
  const [products, users] = await Promise.all([
    prisma.product.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    isManagerRole(user.role)
      ? prisma.user.findMany({
          where: {
            isActive: true,
            role: { in: ["SalesMember", "SalesManager", "SocialMediaManager"] },
          },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
  ]);

  return (
    <div>
      <PageHeader
        title="New outreach"
        description="Creates org + contact + product lead with a product-specific Lead ID (e.g. VF001). Stage starts at New — qualify or log any activity next."
      />
      <NewLeadForm
        products={products.map((p) => ({ id: p.id, name: p.name, code: p.code }))}
        assignableUsers={users.map((u) => ({ id: u.id, name: u.name, role: u.role }))}
        isManager={isManagerRole(user.role)}
      />
    </div>
  );
}
