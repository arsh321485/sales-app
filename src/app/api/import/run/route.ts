import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser, isManagerRole } from "@/lib/auth";
import { DEFAULT_PRODUCTS } from "@/lib/constants";
import { logActivity } from "@/lib/leads";
import {
  leadCodeNumber,
  normalizeStage,
  normalizeTemperature,
  parseMaybeDate,
  type ImportFieldKey,
} from "@/lib/import-outreach";

export const runtime = "nodejs";

type ProductRow = {
  id: string;
  name: string;
  code: string;
  prefix: string;
  nextNumber: number;
  isActive: boolean;
};

type MappedRow = Partial<Record<ImportFieldKey, string>>;

function applyMapping(
  row: Record<string, string>,
  mapping: Record<string, string>,
): MappedRow {
  const out: MappedRow = {};
  for (const [header, field] of Object.entries(mapping)) {
    if (!field) continue;
    const val = String(row[header] ?? "").trim();
    if (!val) continue;
    out[field as ImportFieldKey] = val;
  }
  return out;
}

function parseLocation(location: string | undefined, geography: string | undefined) {
  const city = location?.split(",")[0]?.trim() || null;
  let country = "India";
  if (geography) {
    country = geography.split("/")[0]?.trim() || geography.trim() || "India";
  }
  if (!country) country = "India";
  return { city, country };
}

function safeDate(d: Date | null | undefined): Date | null {
  if (!d) return null;
  return Number.isNaN(d.getTime()) ? null : d;
}

function bumpProductCounter(prefix: string, code: string, currentNext: number) {
  const n = leadCodeNumber(code);
  if (n == null) return null;
  if (!code.toUpperCase().startsWith(prefix.toUpperCase())) return null;
  if (n >= currentNext) return n + 1;
  return null;
}

function indexProduct(map: Map<string, ProductRow>, p: ProductRow) {
  map.set(p.name.toLowerCase(), p);
  map.set(p.code.toLowerCase(), p);
  map.set(p.prefix.toLowerCase(), p);
}

function defaultProductMatch(raw: string) {
  const key = raw.trim().toLowerCase();
  return (
    DEFAULT_PRODUCTS.find(
      (p) =>
        p.name.toLowerCase() === key ||
        p.code.toLowerCase() === key ||
        p.prefix.toLowerCase() === key,
    ) ?? null
  );
}

/** Infer VF / GM from Lead ID like VF001 */
function prefixFromLeadCode(leadCode: string) {
  const m = leadCode.trim().match(/^([A-Za-z]+)/);
  return m ? m[1].toUpperCase() : null;
}

async function resolveProduct(
  productRaw: string,
  leadCode: string,
  productByKey: Map<string, ProductRow>,
): Promise<ProductRow | null> {
  const existing = productByKey.get(productRaw.toLowerCase());
  if (existing) return existing;

  // Match known defaults (VaptFix, GRCMentor, …) and create if missing
  let def = defaultProductMatch(productRaw);
  if (!def && leadCode) {
    const prefix = prefixFromLeadCode(leadCode);
    if (prefix) {
      def =
        DEFAULT_PRODUCTS.find((p) => p.prefix === prefix || p.code === prefix) ??
        null;
    }
  }

  if (def) {
    const created = await prisma.product.create({
      data: {
        name: def.name,
        code: def.code,
        prefix: def.prefix,
        nextNumber: 1,
        isActive: true,
      },
    });
    const row: ProductRow = {
      id: created.id,
      name: created.name,
      code: created.code,
      prefix: created.prefix,
      nextNumber: created.nextNumber,
      isActive: created.isActive,
    };
    indexProduct(productByKey, row);
    return row;
  }

  // Unknown product name — create with inferred code from name / lead id
  const prefix =
    prefixFromLeadCode(leadCode) ||
    productRaw.replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase() ||
    "PR";
  const code = prefix.slice(0, 6);
  try {
    const created = await prisma.product.create({
      data: {
        name: productRaw,
        code,
        prefix: code,
        nextNumber: 1,
        isActive: true,
      },
    });
    const row: ProductRow = {
      id: created.id,
      name: created.name,
      code: created.code,
      prefix: created.prefix,
      nextNumber: created.nextNumber,
      isActive: created.isActive,
    };
    indexProduct(productByKey, row);
    return row;
  } catch {
    // code collision — try fetch existing by code
    const byCode = await prisma.product.findFirst({
      where: { OR: [{ code }, { name: productRaw }] },
    });
    if (byCode) {
      const row: ProductRow = {
        id: byCode.id,
        name: byCode.name,
        code: byCode.code,
        prefix: byCode.prefix,
        nextNumber: byCode.nextNumber,
        isActive: byCode.isActive,
      };
      indexProduct(productByKey, row);
      return row;
    }
    return null;
  }
}

export const maxDuration = 300;

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const fileName = String(body.fileName ?? "outreach.xlsx");
    const rowOffset = Math.max(0, Number(body.rowOffset) || 0);
    const rows = Array.isArray(body.rows) ? (body.rows as Record<string, string>[]) : [];
    const mapping = (body.mapping ?? {}) as Record<string, string>;
    const skipDuplicates = body.skipDuplicates !== false;
    const preferExcelOwner = body.preferExcelOwner === true;
    let defaultOwnerId = String(body.defaultOwnerId ?? user.id);
    if (!isManagerRole(user.role)) {
      defaultOwnerId = user.id;
    }

    if (!rows.length) {
      return NextResponse.json({ error: "No rows to import" }, { status: 400 });
    }

    // Keep each request short — client sends chunks
    if (rows.length > 60) {
      return NextResponse.json(
        { error: "Send at most 60 rows per request (use chunked import)." },
        { status: 400 },
      );
    }

    const [products, users] = await Promise.all([
      prisma.product.findMany(),
      prisma.user.findMany({ where: { isActive: true } }),
    ]);

    if (!users.some((u) => u.id === defaultOwnerId)) {
      defaultOwnerId = user.id;
    }

    const productByKey = new Map<string, ProductRow>();
    for (const p of products) {
      indexProduct(productByKey, p);
    }

    const codesInBatch = new Set<string>();
    for (const row of rows) {
      const mapped = applyMapping(row, mapping);
      const code = mapped.leadCode?.trim();
      if (code) codesInBatch.add(code);
    }
    const existingCodes =
      codesInBatch.size > 0
        ? await prisma.lead.findMany({
            where: { leadCode: { in: [...codesInBatch] } },
            select: { leadCode: true },
          })
        : [];
    const knownLeadCodes = new Set(existingCodes.map((l) => l.leadCode));
    const userByName = new Map(
      users.map((u) => [u.name.trim().toLowerCase(), u]),
    );

    let success = 0;
    let skipped = 0;
    let skippedEmpty = 0;
    let skippedDuplicate = 0;
    let errors = 0;
    const errorLines: string[] = [];
    const productsCreated: string[] = [];
    const nextBump = new Map<string, number>();

    for (let i = 0; i < rows.length; i++) {
      const rowLabel = rowOffset + i + 1;
      const mapped = applyMapping(rows[i], mapping);
      let orgName = mapped.orgName?.trim() ?? "";
      let contactName = mapped.contactName?.trim() ?? "";
      let productRaw = mapped.product?.trim() ?? "";
      const leadCodeHint = mapped.leadCode?.trim() || "";

      // Skip only totally empty rows (no identity at all)
      const hasAnySignal =
        Boolean(orgName) ||
        Boolean(contactName) ||
        Boolean(productRaw) ||
        Boolean(leadCodeHint) ||
        Boolean(mapped.email) ||
        Boolean(mapped.phone) ||
        Boolean(mapped.linkedinUrl);
      if (!hasAnySignal) {
        skipped++;
        skippedEmpty++;
        continue;
      }

      // Company / Contact optional — use placeholders when blank
      if (!orgName) orgName = contactName || leadCodeHint || "Unknown company";
      if (!contactName) contactName = "Unknown contact";

      // Product optional if Lead ID prefix can resolve it (VF001 → VaptFix)
      if (!productRaw && leadCodeHint) {
        const prefix = leadCodeHint.match(/^([A-Za-z]+)/)?.[1]?.toUpperCase() ?? "";
        const def = DEFAULT_PRODUCTS.find(
          (p) => p.prefix === prefix || p.code === prefix,
        );
        if (def) productRaw = def.name;
      }
      if (!productRaw) {
        productRaw = "General";
      }

      const beforeKeys = productByKey.size;
      let product: ProductRow | null = null;
      try {
        product = await resolveProduct(productRaw, leadCodeHint, productByKey);
      } catch (err) {
        console.error(err);
        errors++;
        errorLines.push(`Row ${rowLabel}: product resolve failed for "${productRaw}"`);
        continue;
      }
      if (!product) {
        errors++;
        errorLines.push(`Row ${rowLabel}: could not resolve product "${productRaw}"`);
        continue;
      }
      if (productByKey.size > beforeKeys) {
        productsCreated.push(product.name);
      }

      let leadCode = leadCodeHint;
      if (leadCode) {
        if (knownLeadCodes.has(leadCode)) {
          if (skipDuplicates) {
            skipped++;
            skippedDuplicate++;
            continue;
          }
          errors++;
          errorLines.push(`Row ${rowLabel}: Lead ID ${leadCode} already exists`);
          continue;
        }
      } else {
        let current = nextBump.get(product.id) ?? product.nextNumber;
        // Skip ahead if generated code already exists in DB
        for (let guard = 0; guard < 50; guard++) {
          const candidate = `${product.prefix}${String(current).padStart(3, "0")}`;
          if (knownLeadCodes.has(candidate)) {
            current++;
            continue;
          }
          const clash = await prisma.lead.findFirst({
            where: { leadCode: candidate },
            select: { id: true },
          });
          if (clash) {
            knownLeadCodes.add(candidate);
            current++;
            continue;
          }
          leadCode = candidate;
          nextBump.set(product.id, current + 1);
          break;
        }
        if (!leadCode) {
          errors++;
          errorLines.push(`Row ${rowLabel}: could not allocate Lead ID`);
          continue;
        }
      }

      let ownerId = defaultOwnerId;
      if (preferExcelOwner && mapped.outreachOwner) {
        const match = userByName.get(mapped.outreachOwner.toLowerCase());
        if (match) ownerId = match.id;
      }

      const { city, country } = parseLocation(mapped.location, mapped.geography);
      const notesParts = [
        mapped.notes?.trim() || null,
        mapped.outreachStatus ? `Outreach: ${mapped.outreachStatus}` : null,
        mapped.responseStatus ? `Response: ${mapped.responseStatus}` : null,
        mapped.lastReplyDate ? `Last reply: ${mapped.lastReplyDate}` : null,
      ].filter(Boolean);

      const qualificationRaw = mapped.qualification?.trim() || "";
      let qualification: string | null = null;
      let salesStage = "New";
      if (/qualified/i.test(qualificationRaw) && !/unqualified/i.test(qualificationRaw)) {
        qualification = "Qualified";
        salesStage = "Qualified";
      } else if (/unqualified/i.test(qualificationRaw)) {
        qualification = "Unqualified";
      } else if (/pending/i.test(qualificationRaw)) {
        qualification = "Pending";
      } else if (qualificationRaw) {
        qualification = qualificationRaw;
      }

      const stageFromExcel = normalizeStage(mapped.salesStage ?? "");
      if (stageFromExcel) salesStage = stageFromExcel;

      const temperature = normalizeTemperature(mapped.temperature ?? "");
      const source =
        mapped.source?.trim() ||
        mapped.outreachChannel?.trim() ||
        "Excel import";
      const nextAction =
        mapped.nextAction?.trim() || "Review imported outreach";
      const nextFollowUpAt = safeDate(parseMaybeDate(mapped.nextFollowUpAt ?? ""));
      const leadStatus = mapped.leadStatus?.trim() || "Open";
      const outreachAt =
        safeDate(parseMaybeDate(mapped.outreachDate ?? "")) ?? new Date();
      const lastReplyDate = safeDate(parseMaybeDate(mapped.lastReplyDate ?? ""));

      try {
        const org = await prisma.organization.create({
          data: {
            orgName: orgName.slice(0, 500),
            websiteDomain: mapped.websiteDomain?.slice(0, 300) || null,
            industry: mapped.industry?.slice(0, 200) || null,
            city: city?.slice(0, 120) || null,
            country: country.slice(0, 120),
            notes: mapped.location?.slice(0, 2000) || null,
          },
        });

        const contact = await prisma.contact.create({
          data: {
            organizationId: org.id,
            fullName: contactName.slice(0, 200),
            designation: mapped.designation?.slice(0, 200) || null,
            email: mapped.email?.slice(0, 200) || null,
            phone: mapped.phone?.slice(0, 80) || null,
            linkedinUrl: mapped.linkedinUrl?.slice(0, 500) || null,
          },
        });

        const lead = await prisma.lead.create({
          data: {
            leadCode,
            organizationId: org.id,
            productId: product.id,
            contactId: contact.id,
            ownerId,
            salesStage,
            temperature,
            qualification,
            source: source.slice(0, 200),
            campaign: mapped.campaign?.slice(0, 200) || null,
            painPoint: mapped.painPoint?.slice(0, 2000) || null,
            status: leadStatus.slice(0, 80),
            notes: notesParts.length ? notesParts.join(" · ").slice(0, 4000) : null,
            nextAction: nextAction.slice(0, 500),
            nextFollowUpAt,
            outreachDate: outreachAt,
            outreachChannel: mapped.outreachChannel?.slice(0, 120) || null,
            outreachStatus: mapped.outreachStatus?.slice(0, 200) || null,
            responseStatus: mapped.responseStatus?.slice(0, 200) || null,
            lastReplyDate,
            nextPhase: /meeting/i.test(mapped.nextAction ?? "")
              ? "Meeting"
              : /demo/i.test(mapped.nextAction ?? "")
                ? "Demo"
                : "Follow-up 1",
            createdAt: outreachAt,
          },
        });

        knownLeadCodes.add(leadCode);

        await logActivity({
          leadId: lead.id,
          userId: user.id,
          activityType: "Import",
          title: `Imported outreach ${leadCode}`,
          detail: [mapped.outreachChannel, mapped.campaign, mapped.outreachStatus]
            .filter(Boolean)
            .join(" · "),
          occurredAt: outreachAt,
        });

        const bump = bumpProductCounter(
          product.prefix,
          leadCode,
          nextBump.get(product.id) ?? product.nextNumber,
        );
        if (bump != null) {
          nextBump.set(product.id, Math.max(nextBump.get(product.id) ?? 0, bump));
        }

        success++;
      } catch (err) {
        console.error(err);
        const msg =
          err instanceof Error ? err.message.slice(0, 120) : "unknown error";
        errors++;
        errorLines.push(`Row ${rowLabel}: failed to save (${leadCode || orgName}) — ${msg}`);
      }
    }

    for (const [productId, next] of nextBump) {
      const p = await prisma.product.findUnique({ where: { id: productId } });
      if (p && next > p.nextNumber) {
        await prisma.product.update({
          where: { id: productId },
          data: { nextNumber: next },
        });
      }
    }

    try {
      await prisma.importLog.create({
        data: {
          source: "Excel Outreach",
          fileName,
          importedById: user.id,
          successCount: success,
          skippedCount: skipped,
          errorCount: errors,
          errorSummary: errorLines.slice(0, 40).join("\n") || null,
        },
      });
    } catch (logErr) {
      console.error("importLog create failed", logErr);
    }

    return NextResponse.json({
      success,
      skipped,
      skippedEmpty,
      skippedDuplicate,
      errors,
      errorLines: errorLines.slice(0, 50),
      productsCreated: [...new Set(productsCreated)],
      message:
        success === 0 && skippedDuplicate > 0
          ? `No new leads. ${skippedDuplicate} already imported (same Lead ID). ${skippedEmpty} blank Excel rows ignored.`
          : undefined,
    });
  } catch (e) {
    console.error(e);
    const detail = e instanceof Error ? e.message : "Import failed";
    return NextResponse.json(
      { error: detail.slice(0, 300) || "Import failed" },
      { status: 500 },
    );
  }
}
