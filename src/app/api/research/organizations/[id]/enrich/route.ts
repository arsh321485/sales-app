import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser, isMongoObjectId } from "@/lib/auth";
import { enrichFromWebsite } from "@/lib/research-enrich";
import { recordClaims, publishOrgField, type ClaimInput } from "@/lib/research-claims";

function str(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s || null;
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { id } = await ctx.params;
    if (!isMongoObjectId(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const org = await prisma.organization.findFirst({ where: { id, isDeleted: false } });
    if (!org) return NextResponse.json({ error: "Not found" }, { status: 404 });

    let body: Record<string, unknown> = {};
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      body = {};
    }
    const domain = str(body.domain) ?? str(body.websiteDomain) ?? org.websiteDomain;
    if (!domain) {
      return NextResponse.json(
        { error: "Organization has no websiteDomain; provide domain in body" },
        { status: 400 },
      );
    }

    const job = await prisma.researchJob.create({
      data: {
        organizationId: id,
        jobType: "website_enrich",
        status: "Running",
        startedAt: new Date(),
        createdById: user.id,
      },
    });

    try {
      const enrichment = await enrichFromWebsite(domain);

      const claimDefs: Array<{
        field: string;
        value: string | null;
        confidence: number;
        publishable: boolean;
      }> = [
        { field: "description", value: enrichment.description, confidence: 0.85, publishable: true },
        { field: "linkedinCompanyUrl", value: enrichment.linkedinCompanyUrl, confidence: 0.9, publishable: true },
        { field: "publicPhone", value: enrichment.publicPhone, confidence: 0.85, publishable: true },
        { field: "websiteDomain", value: enrichment.domain, confidence: 0.9, publishable: true },
        // Title is a noisy proxy for legal name — record only, never auto-publish.
        { field: "orgName", value: enrichment.title, confidence: 0.6, publishable: false },
      ];

      const inputs: ClaimInput[] = claimDefs
        .filter((c) => c.value != null && String(c.value).trim() !== "")
        .map((c) => ({
          entityType: "organization",
          entityId: id,
          field: c.field,
          value: String(c.value),
          sourceName: "Company website",
          sourceUrl: enrichment.url,
          method: "website",
          confidence: c.confidence,
          createdById: user.id,
        }));
      if (inputs.length) await recordClaims(inputs);

      // schema.org name/phone, when present, reinforce the same fields
      if (enrichment.schemaOrg && typeof enrichment.schemaOrg === "object") {
        const schema = enrichment.schemaOrg as Record<string, unknown>;
        const extra: ClaimInput[] = [];
        if (typeof schema.name === "string" && schema.name.trim()) {
          extra.push({
            entityType: "organization",
            entityId: id,
            field: "orgName",
            value: schema.name.trim(),
            sourceName: "Company website",
            sourceUrl: enrichment.url,
            method: "website",
            confidence: 0.85,
            createdById: user.id,
          });
        }
        if (typeof schema.telephone === "string" && schema.telephone.trim()) {
          extra.push({
            entityType: "organization",
            entityId: id,
            field: "publicPhone",
            value: schema.telephone.trim(),
            sourceName: "Company website",
            sourceUrl: enrichment.url,
            method: "website",
            confidence: 0.85,
            createdById: user.id,
          });
        }
        if (extra.length) await recordClaims(extra);
      }

      const published: string[] = [];
      for (const c of claimDefs) {
        if (!c.publishable || !c.value || c.confidence < 0.8) continue;
        const ok = await publishOrgField({
          orgId: id,
          field: c.field,
          value: c.value,
          sourceName: "Company website",
          method: "website",
          confidence: c.confidence,
        });
        if (ok) published.push(c.field);
      }

      await prisma.organization.update({
        where: { id },
        data: { lastVerifiedAt: new Date() },
      });

      const completed = await prisma.researchJob.update({
        where: { id: job.id },
        data: {
          status: "Completed",
          finishedAt: new Date(),
          summary: `Fetched ${enrichment.url}; published fields: ${published.join(", ") || "none"}; ${enrichment.publishedEmails.length} published email(s) suggested`,
        },
      });

      const updatedOrg = await prisma.organization.findUnique({ where: { id } });
      return NextResponse.json({
        enrichment,
        job: completed,
        organization: updatedOrg,
        published,
        publishedEmails: enrichment.publishedEmails,
        suggestions: enrichment.publishedEmails,
      });
    } catch (enrichErr) {
      const message = enrichErr instanceof Error ? enrichErr.message : "Enrichment failed";
      const failed = await prisma.researchJob.update({
        where: { id: job.id },
        data: { status: "Failed", finishedAt: new Date(), error: message },
      });
      return NextResponse.json({ error: message, job: failed }, { status: 502 });
    }
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Could not enrich organization" }, { status: 500 });
  }
}
