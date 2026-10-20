import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser, isMongoObjectId } from "@/lib/auth";
import { normalizeDomain, employeeRangeFromCount } from "@/lib/research";
import { recordClaims, type ClaimInput } from "@/lib/research-claims";

const STRING_FIELDS = [
  "orgName",
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

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { id } = await ctx.params;
    if (!isMongoObjectId(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const org = await prisma.organization.findFirst({
      where: { id, isDeleted: false },
      include: {
        contacts: { where: { isDeleted: false }, orderBy: { createdAt: "desc" } },
        researchJobs: { orderBy: { createdAt: "desc" } },
      },
    });
    if (!org) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const fieldClaims = await prisma.fieldClaim.findMany({
      where: { entityType: "organization", entityId: id },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ ...org, fieldClaims });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Could not load organization" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { id } = await ctx.params;
    if (!isMongoObjectId(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const existing = await prisma.organization.findFirst({ where: { id, isDeleted: false } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = (await req.json()) as Record<string, unknown>;
    const data: Record<string, unknown> = {};
    const claims: Array<{ field: string; value: string }> = [];
    const consider = (field: string, value: unknown) => {
      if (body[field] === undefined) return;
      data[field] = value;
      if (value != null && String(value).trim() !== "") {
        claims.push({ field, value: String(value) });
      }
    };

    for (const f of STRING_FIELDS) {
      if (f === "orgName") {
        const v = str(body.orgName);
        if (body.orgName !== undefined && !v) {
          return NextResponse.json({ error: "orgName cannot be empty" }, { status: 400 });
        }
        consider(f, v);
      } else {
        consider(f, str(body[f]));
      }
    }
    if (body.websiteDomain !== undefined) {
      const raw = str(body.websiteDomain);
      consider("websiteDomain", raw ? normalizeDomain(raw) : null);
    }
    if (body.employeeCount !== undefined) {
      const n = intVal(body.employeeCount);
      consider("employeeCount", n);
      if (n != null && body.employeeRange === undefined) {
        const range = employeeRangeFromCount(n);
        if (range) {
          data.employeeRange = range;
          claims.push({ field: "employeeRange", value: range });
        }
      }
    }
    if (body.foundedYear !== undefined) consider("foundedYear", intVal(body.foundedYear));
    if (body.lastVerifiedAt !== undefined) {
      data.lastVerifiedAt = body.lastVerifiedAt ? new Date(String(body.lastVerifiedAt)) : null;
    }
    if (str(body.researchStatus) === "Published") {
      data.lastVerifiedAt = new Date();
    }

    const updated = await prisma.organization.update({
      where: { id },
      data: data as never,
      include: {
        contacts: { where: { isDeleted: false }, orderBy: { createdAt: "desc" } },
        researchJobs: { orderBy: { createdAt: "desc" } },
      },
    });

    if (claims.length) {
      const inputs: ClaimInput[] = claims.map((c) => ({
        entityType: "organization",
        entityId: id,
        field: c.field,
        value: c.value,
        sourceName: "Manual entry",
        sourceUrl: str(body.sourceUrl),
        method: "human",
        confidence: 0.95,
        createdById: user.id,
      }));
      await recordClaims(inputs);
    }
    const fieldClaims = await prisma.fieldClaim.findMany({
      where: { entityType: "organization", entityId: id },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ ...updated, fieldClaims });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Could not update organization" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { id } = await ctx.params;
    if (!isMongoObjectId(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const existing = await prisma.organization.findFirst({ where: { id, isDeleted: false } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await prisma.organization.update({ where: { id }, data: { isDeleted: true } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Could not delete organization" }, { status: 500 });
  }
}
