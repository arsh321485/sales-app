import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import { requireManager } from "@/lib/auth";
import { AdminSettings } from "@/components/admin-settings";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const me = await requireManager();

  const [users, products, resources, teams] = await Promise.all([
    prisma.user.findMany({ include: { team: true }, orderBy: { name: "asc" } }),
    prisma.product.findMany({ orderBy: { name: "asc" } }),
    prisma.salesResource.findMany({
      include: { product: true },
      orderBy: { title: "asc" },
    }),
    prisma.team.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Users, products (Lead ID prefixes), SharePoint sales resources, and teams. No sample/seed leads — start empty and build real data."
      />
      <AdminSettings
        currentUserId={me.id}
        teams={teams.map((t) => ({ id: t.id, name: t.name, code: t.code }))}
        initialUsers={users.map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          teamId: u.teamId,
          teamName: u.team?.name ?? null,
          isActive: u.isActive,
        }))}
        initialProducts={products.map((p) => ({
          id: p.id,
          name: p.name,
          code: p.code,
          prefix: p.prefix,
          nextNumber: p.nextNumber,
          isActive: p.isActive,
        }))}
        initialResources={resources.map((r) => ({
          id: r.id,
          title: r.title,
          resourceType: r.resourceType,
          sharePointUrl: r.sharePointUrl,
          productId: r.productId,
          productName: r.product.name,
          isActive: r.isActive,
        }))}
      />
    </div>
  );
}
