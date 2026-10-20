import { domainToUrl, normalizeDomain } from "./research";

export type WebsiteEnrichment = {
  url: string;
  domain: string;
  title: string | null;
  description: string | null;
  linkedinCompanyUrl: string | null;
  publicPhone: string | null;
  publishedEmails: string[];
  schemaOrg: Record<string, unknown> | null;
  textSample: string;
  fetchedAt: string;
};

function stripTags(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function firstMatch(html: string, re: RegExp): string | null {
  const m = html.match(re);
  return m ? m[1].trim() : null;
}

export async function enrichFromWebsite(input: string): Promise<WebsiteEnrichment> {
  const domain = normalizeDomain(input);
  if (!domain) throw new Error("Valid website/domain required");
  const url = domainToUrl(domain);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  let html = "";
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "PipelineOS-Research/1.0 (+research; respects robots.txt)",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    });
    if (!res.ok) throw new Error(`Website returned ${res.status}`);
    html = await res.text();
  } finally {
    clearTimeout(timeout);
  }

  const title = firstMatch(html, /<title[^>]*>([^<]+)<\/title>/i);
  const description =
    firstMatch(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) ||
    firstMatch(html, /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i) ||
    firstMatch(html, /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i);

  const linkedinCompanyUrl =
    firstMatch(html, /(https?:\/\/(?:www\.)?linkedin\.com\/company\/[A-Za-z0-9\-_%]+)/i);

  const phoneMatch = html.match(/href=["']tel:([+0-9 ()-]{7,})["']/i);
  const publicPhone = phoneMatch ? phoneMatch[1].trim() : null;

  const emails = new Set<string>();
  for (const m of html.matchAll(/mailto:([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/gi)) emails.add(m[1].toLowerCase());
  for (const m of stripTags(html).matchAll(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g)) {
    const e = m[0].toLowerCase();
    if (e.endsWith(`@${domain}`) || e.includes(domain.split(".")[0])) emails.add(e);
    if (emails.size > 20) break;
  }

  let schemaOrg: Record<string, unknown> | null = null;
  const ld = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i);
  if (ld) {
    try {
      const parsed = JSON.parse(ld[1]);
      schemaOrg = Array.isArray(parsed) ? parsed[0] : parsed;
    } catch { /* ignore */ }
  }

  return {
    url,
    domain,
    title,
    description,
    linkedinCompanyUrl,
    publicPhone,
    publishedEmails: [...emails].slice(0, 20),
    schemaOrg,
    textSample: stripTags(html).slice(0, 4000),
    fetchedAt: new Date().toISOString(),
  };
}
