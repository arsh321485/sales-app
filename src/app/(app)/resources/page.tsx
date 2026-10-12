import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { PageHeader, Panel, Badge } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function ResourcesPage() {
  await requireUser();
  const rows = await prisma.salesResource.findMany({
    where: { isActive: true },
    include: { product: true },
    orderBy: [{ product: { name: "asc" } }, { title: "asc" }],
  });

  return (
    <div>
      <PageHeader
        title="Sales resources"
        description="SharePoint links by product (proposal, pricing, presentation…). Managers add these in Settings."
      />
      <Panel>
        <ul className="divide-y divide-[var(--border)] text-sm">
          {rows.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
              <div>
                <a
                  href={r.sharePointUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-[var(--accent)]"
                >
                  {r.title}
                </a>
                <p className="text-xs text-[var(--muted)]">
                  {r.product.name} · {r.resourceType}
                </p>
              </div>
              <Badge>{r.resourceType}</Badge>
            </li>
          ))}
          {rows.length === 0 ? (
            <li className="py-8 text-center text-[var(--muted)]">
              No resources linked yet. Ask admin to add SharePoint URLs in Settings.
            </li>
          ) : null}
        </ul>
      </Panel>
    </div>
  );
}
