import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { normalizeDomain, employeeRangeFromCount } from "@/lib/research";
import { recordClaims, type ClaimInput } from "@/lib/research-claims";

const STRING_FIELDS = [
  "tradingName",
  "linkedinCompanyUrl",
  "industry",
  "subIndustry",
  "city",
  "state",
  "country",
  "hqStreet",
  "operatingCountries",
  "companyType",
  "legalForm",
  "parentName",
  "description",
  "businessModel",
  "productsServices",
  "targetCustomers",
  "mainMarkets",
  "employeeRange",
  "businessStage",
  "publicPhone",
  "registrationNumber",
  "registrySource",
  "researchStatus",
  "notes",
] as const;

function str(v: unknown): string | null {
  if (v == null) return null;
  if (Array.isArray(v)) {
    const joined = v.map((x) => String(x).trim()).filter(Boolean).join(", ");
    return joined || null;
  }
  const s = String(v).trim();
  return s || null;
}

function intVal(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : parseInt(String(v), 10);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

/** Build prisma data + human-claim entries from a request body. */
function orgDataFromBody(
  body: Record<string, unknown>,
  partial: boolean,
): { data: Record<string, unknown>; claims: Array<{ field: string; value: string }> } {
  const data: Record<string, unknown> = {};
  const claims: Array<{ field: string; value: string }> = [];

  const consider = (field: string, value: unknown) => {
    if (partial && body[field] === undefined) return;
    if (!partial && body[field] === undefined) return;
    data[field] = value;
    if (value != null && String(value).trim() !== "") {
      claims.push({ field, value: String(value) });
    }
  };

  consider("orgName", str(body.orgName));
  if (body.websiteDomain !== undefined || !partial) {
    const raw = str(body.websiteDomain);
    consider("websiteDomain", raw ? normalizeDomain(raw) : null);
  }
  for (const f of STRING_FIELDS) consider(f, str(body[f]));

  if (body.employeeCount !== undefined || !partial) {
    if (!(partial && body.employeeCount === undefined)) {
      const n = intVal(body.employeeCount);
      consider("employeeCount", n);
      if (n != null && !str(body.employeeRange)) {
        const range = employeeRangeFromCount(n);
        if (range) {
          data.employeeRange = range;
          claims.push({ field: "employeeRange", value: range });
        }
      }
    }
  }
  if (body.foundedYear !== undefined || !partial) {
    if (!(partial && body.foundedYear === undefined)) {
      consider("foundedYear", intVal(body.foundedYear));
    }
  }
  return { data, claims };
}

async function recordOrgClaims(
  orgId: string,
  claims: Array<{ field: string; value: string }>,
  createdById: string,
  sourceUrl?: string | null,
) {
  const inputs: ClaimInput[] = claims.map((c) => ({
    entityType: "organization",
    entityId: orgId,
    field: c.field,
    value: c.value,
    sourceName: "Manual entry",
    sourceUrl: sourceUrl ?? null,
    method: "human",
    confidence: 0.95,
    createdById,
  }));
  if (inputs.length) await recordClaims(inputs);
}

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const url = new URL(req.url);
    const q = url.searchParams.get("q")?.trim() ?? "";
    const status = url.searchParams.get("status")?.trim() ?? "";

    const where: Record<string, unknown> = { isDeleted: false };
    if (status) where.researchStatus = status;
    if (q) {
      where.OR = [
        { orgName: { contains: q, mode: "insensitive" } },
        { websiteDomain: { contains: q, mode: "insensitive" } },
        { industry: { contains: q, mode: "insensitive" } },
      ];
    }

    const orgs = await prisma.organization.findMany({
      where: where as never,
      include: {
        _count: { select: { contacts: { where: { isDeleted: false } } } },
      },
      orderBy: { updatedAt: "desc" },
    });

    const result = orgs.map((org) => {
      const { _count, ...rest } = org;
      return { ...rest, contactsCount: _count.contacts, _count };
    });
    return NextResponse.json(result);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Could not list organizations" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const rawDomain = str(body.websiteDomain);
    const websiteDomain = rawDomain ? normalizeDomain(rawDomain) : null;
    let orgName = str(body.orgName);
    if (!orgName && websiteDomain) {
      const base = websiteDomain.split(".")[0] ?? websiteDomain;
      orgName = base ? base.charAt(0).toUpperCase() + base.slice(1) : websiteDomain;
    }
    if (!orgName && !websiteDomain) {
      return NextResponse.json(
        { error: "orgName or websiteDomain is required" },
        { status: 400 },
      );
    }

    const { data, claims } = orgDataFromBody(body, false);
    data.orgName = orgName;
    data.websiteDomain = websiteDomain;
    if (!data.researchStatus) data.researchStatus = "Draft";
    if (body.country === undefined && !data.country) data.country = "India";

    // Claims should reflect final stored values (incl. derived orgName/domain)
    const finalClaims = [...claims];
    const ensureClaim = (field: string, value: unknown) => {
      if (value == null || String(value).trim() === "") return;
      if (!finalClaims.some((c) => c.field === field)) {
        finalClaims.push({ field, value: String(value) });
      } else {
        const idx = finalClaims.findIndex((c) => c.field === field);
        finalClaims[idx] = { field, value: String(value) };
      }
    };
    ensureClaim("orgName", orgName);
    ensureClaim("websiteDomain", websiteDomain);

    const org = await prisma.organization.create({ data: data as never });
    await recordOrgClaims(org.id, finalClaims, user.id, str(body.sourceUrl));
    const created = await prisma.organization.findUnique({
      where: { id: org.id },
      include: { _count: { select: { contacts: { where: { isDeleted: false } } } } },
    });
    return NextResponse.json(created ?? org, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Could not create organization" }, { status: 500 });
  }
}
