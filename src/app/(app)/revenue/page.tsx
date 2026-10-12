import { prisma } from "@/lib/db";
import { requireManager } from "@/lib/auth";
import { PageHeader, Panel, StatCard } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function RevenuePage() {
  await requireManager();
  const year = new Date().getFullYear();

  const [targets, wonAgg] = await Promise.all([
    prisma.revenueTarget.findMany({
      where: { year },
      include: { product: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.lead.aggregate({
      where: { isDeleted: false, salesStage: "Won", closedAt: { gte: new Date(`${year}-01-01`) } },
      _sum: { wonValue: true },
      _count: { _all: true },
    }),
  ]);

  return (
    <div>
      <PageHeader
        title="Revenue targets"
        description={`${year} targets vs closed-won. Add targets via database/admin tooling as needed.`}
      />
      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        <StatCard label="Won deals YTD" value={wonAgg._count._all} />
        <StatCard
          label="Won value YTD"
          value={wonAgg._sum.wonValue != null ? `₹${wonAgg._sum.wonValue}` : "—"}
        />
      </div>
      <Panel title="Configured targets">
        <ul className="space-y-2 text-sm">
          {targets.map((t) => (
            <li key={t.id} className="flex justify-between">
              <span>
                {t.periodType} · {t.scopeType}
                {t.product ? ` · ${t.product.name}` : ""}
              </span>
              <span className="font-medium">
                {t.currency} {t.amount}
              </span>
            </li>
          ))}
          {targets.length === 0 ? (
            <li className="text-[var(--muted)]">No revenue targets configured yet.</li>
          ) : null}
        </ul>
      </Panel>
    </div>
  );
}
