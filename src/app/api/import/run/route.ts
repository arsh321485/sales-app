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
    country = geography.split("/")[0]?.trim() || geography;
  }
  return { city, country };
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

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const fileName = String(body.fileName ?? "outreach.xlsx");
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
      if (!contactName) contactName = orgName !== "Unknown company" ? "Unknown contact" : "Unknown contact";

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
      const product = await resolveProduct(productRaw, leadCodeHint, productByKey);
      if (!product) {
        errors++;
        errorLines.push(`Row ${i + 1}: could not resolve product "${productRaw}"`);
        continue;
      }
      if (productByKey.size > beforeKeys) {
        productsCreated.push(product.name);
      }

      let leadCode = leadCodeHint;
      if (leadCode) {
        const exists = await prisma.lead.findFirst({ where: { leadCode } });
        if (exists) {
          if (skipDuplicates) {
            skipped++;
            skippedDuplicate++;
            continue;
          }
          errors++;
          errorLines.push(`Row ${i + 1}: Lead ID ${leadCode} already exists`);
          continue;
        }
      } else {
        const current =
          nextBump.get(product.id) ??
          (
            await prisma.product.findUniqueOrThrow({ where: { id: product.id } })
          ).nextNumber;
        leadCode = `${product.prefix}${String(current).padStart(3, "0")}`;
        nextBump.set(product.id, current + 1);
        const clash = await prisma.lead.findFirst({ where: { leadCode } });
        if (clash) {
          errors++;
          errorLines.push(
            `Row ${i + 1}: generated Lead ID ${leadCode} already exists`,
          );
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
      const nextFollowUpAt = parseMaybeDate(mapped.nextFollowUpAt ?? "");
      const leadStatus = mapped.leadStatus?.trim() || "Open";

      try {
        const org = await prisma.organization.create({
          data: {
            orgName,
            websiteDomain: mapped.websiteDomain || null,
            industry: mapped.industry || null,
            city,
            country,
            notes: mapped.location || null,
          },
        });

        const contact = await prisma.contact.create({
          data: {
            organizationId: org.id,
            fullName: contactName,
            designation: mapped.designation || null,
            email: mapped.email || null,
            phone: mapped.phone || null,
            linkedinUrl: mapped.linkedinUrl || null,
          },
        });

        const outreachAt = parseMaybeDate(mapped.outreachDate ?? "") ?? new Date();

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
            source,
            campaign: mapped.campaign || null,
            painPoint: mapped.painPoint || null,
            status: leadStatus,
            notes: notesParts.length ? notesParts.join(" · ") : null,
            nextAction,
            nextFollowUpAt,
            outreachDate: outreachAt,
            outreachChannel: mapped.outreachChannel || null,
            outreachStatus: mapped.outreachStatus || null,
            responseStatus: mapped.responseStatus || null,
            lastReplyDate: parseMaybeDate(mapped.lastReplyDate ?? ""),
            nextPhase: mapped.nextAction?.includes("meeting")
              ? "Meeting"
              : mapped.nextAction?.includes("demo")
                ? "Demo"
                : "Follow-up 1",
            createdAt: outreachAt,
          },
        });

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
        errors++;
        errorLines.push(`Row ${i + 1}: failed to save (${leadCode || orgName})`);
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
    return NextResponse.json({ error: "Import failed" }, { status: 500 });
  }
}
