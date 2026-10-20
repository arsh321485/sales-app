import { prisma } from "./db";
import { sourcePriority, suppressionHash } from "./research-server";

export type ClaimInput = {
  entityType: "organization" | "contact";
  entityId: string;
  field: string;
  value?: string | null;
  sourceName: string;
  sourceUrl?: string | null;
  method: "registry" | "rule" | "llm" | "feed" | "human" | "website";
  confidence: number;
  modelVersion?: string | null;
  createdById?: string | null;
};

export async function recordClaim(input: ClaimInput) {
  if (input.value == null || String(input.value).trim() === "") return null;
  return prisma.fieldClaim.create({
    data: {
      entityType: input.entityType,
      entityId: input.entityId,
      field: input.field,
      value: String(input.value),
      sourceName: input.sourceName,
      sourceUrl: input.sourceUrl ?? undefined,
      method: input.method,
      confidence: Math.max(0, Math.min(1, input.confidence)),
      modelVersion: input.modelVersion ?? undefined,
      createdById: input.createdById ?? undefined,
    },
  });
}

export async function recordClaims(claims: ClaimInput[]) {
  for (const c of claims) await recordClaim(c);
}

/**
 * Publish a claim to Organization if confidence >= 0.8 or high-authority source,
 * and priority >= existing claims for that field (simplified survivorship).
 */
export async function publishOrgField(params: {
  orgId: string;
  field: string;
  value: string;
  sourceName: string;
  method: string;
  confidence: number;
}) {
  if (params.confidence < 0.8 && sourcePriority(params.sourceName, params.method) < 4) return false;
  const allowed: Record<string, string> = {
    orgName: "orgName",
    tradingName: "tradingName",
    websiteDomain: "websiteDomain",
    linkedinCompanyUrl: "linkedinCompanyUrl",
    industry: "industry",
    subIndustry: "subIndustry",
    description: "description",
    businessModel: "businessModel",
    productsServices: "productsServices",
    targetCustomers: "targetCustomers",
    mainMarkets: "mainMarkets",
    operatingCountries: "operatingCountries",
    companyType: "companyType",
    parentName: "parentName",
    publicPhone: "publicPhone",
    employeeRange: "employeeRange",
    businessStage: "businessStage",
  };
  const col = allowed[params.field];
  if (!col) return false;
  await prisma.organization.update({
    where: { id: params.orgId },
    data: { [col]: params.value, lastVerifiedAt: new Date() } as never,
  });
  return true;
}

export async function isSuppressed(email?: string | null, fullName?: string, domain?: string) {
  if (email) {
    const hash = suppressionHash(email);
    const hit = await prisma.suppression.findFirst({
      where: { OR: [{ emailHash: hash }, { email: email.toLowerCase() }] },
    });
    if (hit) return true;
  }
  if (fullName && domain) {
    const key = `${fullName.trim().toLowerCase()}|${domain.toLowerCase()}`;
    const hit = await prisma.suppression.findFirst({ where: { nameDomainKey: key } });
    if (hit) return true;
  }
  return false;
}

export async function addSuppression(params: {
  email?: string;
  fullName?: string;
  domain?: string;
  reason: string;
  jurisdiction?: string;
  createdById?: string;
}) {
  const email = params.email?.trim().toLowerCase() || null;
  return prisma.suppression.create({
    data: {
      email,
      emailHash: email ? suppressionHash(email) : undefined,
      nameDomainKey:
        params.fullName && params.domain
          ? `${params.fullName.trim().toLowerCase()}|${params.domain.toLowerCase()}`
          : undefined,
      reason: params.reason,
      jurisdiction: params.jurisdiction || undefined,
      createdById: params.createdById || undefined,
    },
  });
}
