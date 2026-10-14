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
            role: { in: ["SalesMember", "SalesManager", "SocialMediaManager", "SuperAdmin"] },
          },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([
          { id: user.id, name: user.name, role: user.role },
        ]),
  ]);

  return (
    <div>
      <PageHeader
        title="New Outreach"
        description="Create a new outreach record. Outreach date is set automatically (you can change it). Proceed to follow-ups, or schedule a meeting/demo directly when ready."
      />
      <NewLeadForm
        products={products.map((p) => ({ id: p.id, name: p.name, code: p.code }))}
        assignableUsers={users.map((u) => ({ id: u.id, name: u.name, role: u.role }))}
        isManager={isManagerRole(user.role)}
        currentUserId={user.id}
      />
    </div>
  );
}
