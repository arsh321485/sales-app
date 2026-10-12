/** Field keys we can map Excel columns into (Outreach + Leads-style sheets). */
export const IMPORT_FIELDS = [
  { key: "leadCode", label: "Lead ID", required: false },
  { key: "product", label: "Product", required: false },
  { key: "orgName", label: "Company", required: false },
  { key: "contactName", label: "Contact Name", required: false },
  { key: "designation", label: "Designation", required: false },
  { key: "email", label: "Email", required: false },
  { key: "phone", label: "Phone", required: false },
  { key: "linkedinUrl", label: "LinkedIn / Profile", required: false },
  { key: "websiteDomain", label: "Website", required: false },
  { key: "industry", label: "Industry", required: false },
  { key: "geography", label: "Geography (Country / Region)", required: false },
  { key: "location", label: "Location / Address", required: false },
  { key: "outreachDate", label: "Outreach Date", required: false },
  { key: "outreachChannel", label: "Outreach Channel", required: false },
  { key: "outreachOwner", label: "Outreach Owner", required: false },
  { key: "campaign", label: "Campaign / Email Type", required: false },
  { key: "outreachStatus", label: "Outreach Status", required: false },
  { key: "responseStatus", label: "Response Status", required: false },
  { key: "lastReplyDate", label: "Last Reply Date", required: false },
  { key: "qualification", label: "Qualification Status", required: false },
  { key: "temperature", label: "Lead Temperature", required: false },
  { key: "source", label: "Source", required: false },
  { key: "salesStage", label: "Pipeline Stage", required: false },
  { key: "leadStatus", label: "Lead Status", required: false },
  { key: "painPoint", label: "Pain Point", required: false },
  { key: "nextAction", label: "Next Action", required: false },
  { key: "nextFollowUpAt", label: "Next Action Date", required: false },
  { key: "notes", label: "Notes / Conversation", required: false },
] as const;

export type ImportFieldKey = (typeof IMPORT_FIELDS)[number]["key"];

/** Excel header (normalized) → our field. */
export const OUTREACH_HEADER_ALIASES: Record<string, ImportFieldKey> = {
  "lead id": "leadCode",
  leadid: "leadCode",
  "lead code": "leadCode",
  product: "product",
  company: "orgName",
  "company name": "orgName",
  "org name": "orgName",
  organization: "orgName",
  "contact name": "contactName",
  contact: "contactName",
  "full name": "contactName",
  designation: "designation",
  title: "designation",
  email: "email",
  "e-mail": "email",
  phone: "phone",
  mobile: "phone",
  "linkedin / profile": "linkedinUrl",
  linkedin: "linkedinUrl",
  "linkedin url": "linkedinUrl",
  website: "websiteDomain",
  "website domain": "websiteDomain",
  domain: "websiteDomain",
  industry: "industry",
  "geography (country / region)": "geography",
  geography: "geography",
  country: "geography",
  "location / address": "location",
  location: "location",
  address: "location",
  "outreach date": "outreachDate",
  "lead date": "outreachDate",
  "outreach channel": "outreachChannel",
  channel: "outreachChannel",
  "outreach owner": "outreachOwner",
  "campaign / email type": "campaign",
  campaign: "campaign",
  "email type": "campaign",
  "outreach status": "outreachStatus",
  "response status": "responseStatus",
  "last reply date": "lastReplyDate",
  "qualification status": "qualification",
  qualification: "qualification",
  "lead temperature": "temperature",
  temperature: "temperature",
  temp: "temperature",
  source: "source",
  "pipeline stage": "salesStage",
  "sales stage": "salesStage",
  stage: "salesStage",
  "lead status": "leadStatus",
  status: "leadStatus",
  "pain point": "painPoint",
  "product interest": "painPoint",
  "next action": "nextAction",
  "next action date": "nextFollowUpAt",
  "next follow-up date": "nextFollowUpAt",
  "next follow up date": "nextFollowUpAt",
  "notes / conversation": "notes",
  "notes/conversation": "notes",
  notes: "notes",
  conversation: "notes",
  // Lead sheet "Owner" (after Outreach Owner is claimed)
  owner: "outreachOwner",
};

export const ALLOWED_STAGES = new Set([
  "New",
  "Qualified",
  "Engaged",
  "Opportunity",
  "Negotiation",
  "Won",
  "Lost",
  "OnHold",
]);

export function normalizeStage(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  if (ALLOWED_STAGES.has(t)) return t;
  const lower = t.toLowerCase();
  const map: Record<string, string> = {
    new: "New",
    qualified: "Qualified",
    engaged: "Engaged",
    working: "Engaged",
    opportunity: "Opportunity",
    negotiation: "Negotiation",
    won: "Won",
    lost: "Lost",
    dropped: "Lost",
    "on hold": "OnHold",
    onhold: "OnHold",
    "on-hold": "OnHold",
  };
  return map[lower] ?? null;
}

export function normalizeTemperature(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  const lower = t.toLowerCase();
  if (lower === "hot") return "Hot";
  if (lower === "warm") return "Warm";
  if (lower === "cold") return "Cold";
  return t;
}

export function normalizeHeader(h: string) {
  return h.replace(/\s+/g, " ").trim().toLowerCase();
}

export function suggestMapping(headers: string[]): Record<string, ImportFieldKey | ""> {
  const used = new Set<string>();
  const mapping: Record<string, ImportFieldKey | ""> = {};
  for (const header of headers) {
    const key = OUTREACH_HEADER_ALIASES[normalizeHeader(header)];
    if (key && !used.has(key)) {
      mapping[header] = key;
      used.add(key);
    } else {
      mapping[header] = "";
    }
  }
  return mapping;
}

export function findHeaderRow(rows: unknown[][]): number {
  const maxScan = Math.min(rows.length, 15);
  for (let i = 0; i < maxScan; i++) {
    const cells = (rows[i] ?? []).map((c) => normalizeHeader(String(c ?? "")));
    const hasLead = cells.some((c) => c === "lead id" || c === "lead code");
    const hasCompany = cells.some((c) => c === "company" || c === "company name");
    const hasProduct = cells.some((c) => c === "product");
    if ((hasLead || hasProduct) && hasCompany) return i;
  }
  for (let i = 0; i < maxScan; i++) {
    if ((rows[i] ?? []).some((c) => String(c ?? "").trim())) return i;
  }
  return 0;
}

export function cellToString(v: unknown): string {
  if (v == null || v === "") return "";
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "number") {
    if (v > 20000 && v < 80000) {
      const epoch = Date.UTC(1899, 11, 30);
      const d = new Date(epoch + v * 86400000);
      return d.toISOString();
    }
    return String(v);
  }
  return String(v).trim();
}

export function parseMaybeDate(v: string): Date | null {
  if (!v) return null;
  const d = new Date(v);
  if (!Number.isNaN(d.getTime())) return d;
  return null;
}

export function leadCodeNumber(code: string): number | null {
  const m = code.trim().match(/(\d+)\s*$/);
  return m ? Number(m[1]) : null;
}
