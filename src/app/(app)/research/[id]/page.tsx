import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser, isManagerRole, isMongoObjectId } from "@/lib/auth";
import { Badge, PageHeader } from "@/components/ui";
import { ResearchDetail } from "@/components/research-detail";

export const dynamic = "force-dynamic";

function statusTone(status: string): "ok" | "warn" | "danger" | "neutral" {
  if (status === "Published") return "ok";
  if (status === "Needs review") return "warn";
  if (status === "Stale") return "danger";
  return "neutral";
}

export default async function ResearchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  if (!isMongoObjectId(id)) notFound();

  const org = await prisma.organization.findFirst({
    where: { id, isDeleted: false },
    include: {
      contacts: { where: { isDeleted: false }, orderBy: { createdAt: "desc" } },
      researchJobs: { orderBy: { createdAt: "desc" }, take: 20 },
    },
  });
  if (!org) notFound();

  const manager = isManagerRole(user.role);
  const [orgClaims, contactClaims, products, users] = await Promise.all([
    prisma.fieldClaim.findMany({
      where: { entityType: "organization", entityId: id },
      orderBy: { createdAt: "desc" },
    }),
    org.contacts.length
      ? prisma.fieldClaim.findMany({
          where: { entityType: "contact", entityId: { in: org.contacts.map((c) => c.id) } },
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]),
    prisma.product.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    manager
      ? prisma.user.findMany({ where: { isActive: true }, orderBy: { name: "asc" } })
      : Promise.resolve([{ id: user.id, name: user.name }]),
  ]);

  const claims = [...orgClaims, ...contactClaims].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
  );

  return (
    <div>
      <PageHeader
        title={org.orgName}
        description={
          [org.industry, org.city, org.country].filter(Boolean).join(" · ") || undefined
        }
        actions={
          <Link href="/research" className="text-sm text-[var(--muted)] hover:text-[var(--ink)]">
            ← Research
          </Link>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Badge tone={statusTone(org.researchStatus)}>{org.researchStatus}</Badge>
        {org.websiteDomain ? (
          <a
            href={`https://${org.websiteDomain}`}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-[var(--accent-ink)] hover:underline"
          >
            {org.websiteDomain}
          </a>
        ) : null}
        {org.linkedinCompanyUrl ? (
          <a href={org.linkedinCompanyUrl} target="_blank" rel="noreferrer" className="text-sm text-[var(--accent-ink)] hover:underline">
            LinkedIn
          </a>
        ) : null}
        <span className="text-sm text-[var(--muted)]">
          Last verified: {org.lastVerifiedAt ? org.lastVerifiedAt.toLocaleDateString("en-GB") : "never"}
        </span>
      </div>

      <ResearchDetail
        org={{
          id: org.id,
          orgName: org.orgName,
          tradingName: org.tradingName,
          websiteDomain: org.websiteDomain,
          linkedinCompanyUrl: org.linkedinCompanyUrl,
          industry: org.industry,
          subIndustry: org.subIndustry,
          city: org.city,
          state: org.state,
          country: org.country,
          hqStreet: org.hqStreet,
          operatingCountries: org.operatingCountries,
          companyType: org.companyType,
          legalForm: org.legalForm,
          parentName: org.parentName,
          description: org.description,
          businessModel: org.businessModel,
          productsServices: org.productsServices,
          targetCustomers: org.targetCustomers,
          mainMarkets: org.mainMarkets,
          employeeCount: org.employeeCount,
          employeeRange: org.employeeRange,
          businessStage: org.businessStage,
          publicPhone: org.publicPhone,
          foundedYear: org.foundedYear,
          registrationNumber: org.registrationNumber,
          registrySource: org.registrySource,
          researchStatus: org.researchStatus,
          lastVerifiedAt: org.lastVerifiedAt?.toISOString() ?? null,
          notes: org.notes,
        }}
        contacts={org.contacts.map((c) => ({
          id: c.id,
          fullName: c.fullName,
          designation: c.designation,
          department: c.department,
          seniority: c.seniority,
          contactCity: c.contactCity,
          contactCountry: c.contactCountry,
          email: c.email,
          emailVerificationStatus: c.emailVerificationStatus,
          emailVerifiedAt: c.emailVerifiedAt?.toISOString() ?? null,
          emailOrigin: c.emailOrigin,
          phone: c.phone,
          linkedinUrl: c.linkedinUrl,
          sourceUrl: c.sourceUrl,
        }))}
        claims={claims.map((c) => ({
          id: c.id,
          entityType: c.entityType,
          entityId: c.entityId,
          field: c.field,
          value: c.value,
          sourceName: c.sourceName,
          sourceUrl: c.sourceUrl,
          method: c.method,
          confidence: c.confidence,
          retrievedAt: c.retrievedAt.toISOString(),
          createdAt: c.createdAt.toISOString(),
        }))}
        jobs={org.researchJobs.map((j) => ({
          id: j.id,
          jobType: j.jobType,
          status: j.status,
          summary: j.summary,
          error: j.error,
          createdAt: j.createdAt.toISOString(),
          finishedAt: j.finishedAt?.toISOString() ?? null,
        }))}
        products={products.map((p) => ({ id: p.id, name: p.name, code: p.code }))}
        users={users.map((u) => ({ id: u.id, name: u.name }))}
        isManager={manager}
        currentUserId={user.id}
      />
    </div>
  );
}
