import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import { requireManager } from "@/lib/auth";
import { AdminUsersPanel } from "@/components/admin-users-panel";
import { AdminCatalogPanels } from "@/components/admin-catalog-panels";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const me = await requireManager();

  const [users, products, masters, teams] = await Promise.all([
    prisma.user.findMany({ include: { team: true }, orderBy: { name: "asc" } }),
    prisma.product.findMany({ orderBy: { name: "asc" } }),
    prisma.master.findMany({ orderBy: [{ category: "asc" }, { sortOrder: "asc" }] }),
    prisma.team.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div>
      <PageHeader
        title="Admin"
        description="Full CRUD for users, teams, products and dropdown masters. Delete user only after reassigning active leads (or deactivate instead)."
      />

      <div className="mb-6">
        <AdminUsersPanel
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
        />
      </div>

      <AdminCatalogPanels
        teams={teams.map((t) => ({ id: t.id, name: t.name, code: t.code }))}
        products={products.map((p) => ({
          id: p.id,
          name: p.name,
          code: p.code,
          isActive: p.isActive,
        }))}
        masters={masters.map((m) => ({
          id: m.id,
          category: m.category,
          code: m.code,
          label: m.label,
          sortOrder: m.sortOrder,
          isActive: m.isActive,
        }))}
      />
    </div>
  );
}
