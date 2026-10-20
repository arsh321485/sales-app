import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { RESEARCH_STATUSES, COMPANY_FIELDS } from "@/lib/research";
import { Badge, PageHeader, Panel, StatCard } from "@/components/ui";

export const dynamic = "force-dynamic";

function statusTone(status: string): "ok" | "warn" | "danger" | "neutral" {
  if (status === "Published") return "ok";
  if (status === "Needs review") return "warn";
  if (status === "Stale") return "danger";
  return "neutral";
}

const field =
  "rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm";

export default async function ResearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  await requireUser();
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const status = (sp.status ?? "").trim();

  const where: Record<string, unknown> = { isDeleted: false };
  if (status) where.researchStatus = status;
  if (q) {
    where.OR = [
      { orgName: { contains: q, mode: "insensitive" } },
      { websiteDomain: { contains: q, mode: "insensitive" } },
      { industry: { contains: q, mode: "insensitive" } },
    ];
  }

  const [orgs, total, published, contactsCount, contactsWithEmail, suppressionCount, openPrivacy] =
    await Promise.all([
      prisma.organization.findMany({
        where: where as never,
        include: {
          _count: {
            select: {
              contacts: { where: { isDeleted: false } },
              leads: { where: { isDeleted: false } },
            },
          },
        },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.organization.count({ where: { isDeleted: false } }),
      prisma.organization.count({ where: { isDeleted: false, researchStatus: "Published" } }),
      prisma.contact.count({ where: { isDeleted: false } }),
      prisma.contact.count({ where: { isDeleted: false, email: { not: null } } }),
      prisma.suppression.count(),
      prisma.privacyEvent.count({ where: { status: "Open" } }),
    ]);

  // Contacts whose email has been through verification (status recorded)
  const verifiedContacts = await prisma.contact.count({
    where: { isDeleted: false, emailVerificationStatus: { not: null } },
  });

  return (
    <div>
      <PageHeader
        title="Research"
        description="Company & contact research workspace — build verified organizations, then convert contacts into pipeline leads."
        actions={
          <>
            <Link href="/research/sources" className="rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm">Sources</Link>
            <Link href="/research/privacy" className="rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm">Privacy</Link>
            <Link href="/research/new" className="rounded-md bg-[var(--accent)] px-3 py-2 text-sm font-medium text-white">New Research Org</Link>
          </>
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Research orgs" value={total} />
        <StatCard label="Published" value={published} hint={total ? `${Math.round((published / total) * 100)}% of orgs` : undefined} />
        <StatCard label="Contacts" value={contactsCount} />
        <StatCard label="Contacts with email" value={contactsWithEmail} hint={`${verifiedContacts} verification checked`} />
        <StatCard label="Suppressions" value={suppressionCount} />
        <StatCard label="Open privacy events" value={openPrivacy} />
      </div>

      <Panel title="Coverage" className="mb-6">
        <p className="text-sm text-[var(--muted)]">
          Target company profile ({COMPANY_FIELDS.length} fields):{" "}
          {COMPANY_FIELDS.map((f) => f.label).join(" · ")}
        </p>
      </Panel>

      <Panel title={`Organizations${orgs.length ? ` (${orgs.length})` : ""}`}>
        <form method="get" className="mb-4 flex flex-wrap gap-2">
          <input name="q" defaultValue={q} placeholder="Search company, domain, industry…" className={`${field} min-w-56 flex-1`} />
          <select name="status" defaultValue={status} className={field}>
            <option value="">All statuses</option>
            {RESEARCH_STATUSES.map((s) => (<option key={s} value={s}>{s}</option>))}
          </select>
          <button type="submit" className="rounded-md bg-[var(--accent)] px-3 py-2 text-sm font-medium text-white">Search</button>
          {(q || status) ? <Link href="/research" className="rounded-md border border-[var(--border)] px-3 py-2 text-sm">Clear</Link> : null}
        </form>

        {orgs.length === 0 ? (
          <p className="py-6 text-center text-sm text-[var(--muted)]">
            No research organizations yet — add your first org or enrich one from its website.{" "}
            <Link href="/research/new" className="font-medium text-[var(--accent-ink)] underline">Add first org</Link>
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-[11px] uppercase text-[var(--muted)]">
                <tr>
                  <th className="pb-2 pr-3">Company</th><th className="pb-2 pr-3">Website</th>
                  <th className="pb-2 pr-3">Industry</th><th className="pb-2 pr-3">HQ country</th>
                  <th className="pb-2 pr-3">Employees</th><th className="pb-2 pr-3">Stage</th>
                  <th className="pb-2 pr-3">Research status</th><th className="pb-2 pr-3">Contacts</th>
                  <th className="pb-2 pr-3">Last verified</th><th className="pb-2">Convert hint</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {orgs.map((org) => (
                  <tr key={org.id} className="align-top">
                    <td className="py-2 pr-3 font-medium"><Link href={`/research/${org.id}`} className="hover:underline">{org.orgName}</Link></td>
                    <td className="py-2 pr-3">{org.websiteDomain ? <a href={`https://${org.websiteDomain}`} target="_blank" rel="noreferrer" className="text-[var(--accent-ink)] hover:underline">{org.websiteDomain}</a> : "—"}</td>
                    <td className="py-2 pr-3">{org.industry || "—"}{org.subIndustry ? <span className="text-[var(--muted)]"> / {org.subIndustry}</span> : null}</td>
                    <td className="py-2 pr-3">{org.country || "—"}</td>
                    <td className="py-2 pr-3">{org.employeeRange || (org.employeeCount != null ? String(org.employeeCount) : "—")}</td>
                    <td className="py-2 pr-3">{org.businessStage || "—"}</td>
                    <td className="py-2 pr-3"><Badge tone={statusTone(org.researchStatus)}>{org.researchStatus}</Badge></td>
                    <td className="py-2 pr-3">{org._count.contacts}</td>
                    <td className="py-2 pr-3 whitespace-nowrap">{org.lastVerifiedAt ? org.lastVerifiedAt.toLocaleDateString("en-GB") : "—"}</td>
                    <td className="py-2 text-[var(--muted)]">{org._count.leads > 0 ? `${org._count.leads} lead(s) created` : org._count.contacts > 0 ? "Ready to convert a contact" : "Add contacts to convert"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
