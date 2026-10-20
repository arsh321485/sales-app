import { createHash } from "crypto";
import { promises as dns } from "dns";
import { isPersonalEmail } from "./research";

export function suppressionHash(email: string): string {
  return createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
}

/** Survivorship priority: registry > GLEIF > website > feed > seed > LLM/rule */
export function sourcePriority(sourceName: string, method: string): number {
  const s = sourceName.toLowerCase();
  if (s.includes("registry")) return 5;
  if (s.includes("gleif")) return 5;
  if (s.includes("website") || s.includes("company site")) return 4;
  if (s.includes("licensed") || s.includes("feed")) return 3;
  if (s.includes("wikidata") || s.includes("people data") || s.includes("seed")) return 2;
  if (method === "llm") return 1;
  return 2;
}

export async function verifyEmailBasic(email: string): Promise<{ status: string; detail: string }> {
  const e = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e)) return { status: "Invalid", detail: "Syntax invalid" };
  if (isPersonalEmail(e)) return { status: "Invalid", detail: "Personal domain blocked by policy" };
  const domain = e.split("@")[1];
  try {
    const mx = await dns.resolveMx(domain);
    if (!mx || mx.length === 0) return { status: "Invalid", detail: "No MX record" };
    return { status: "Unknown", detail: `MX found (${mx[0].exchange}); SMTP probe required for Valid` };
  } catch {
    return { status: "Invalid", detail: "MX lookup failed / no MX" };
  }
}
