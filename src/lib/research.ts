
export const COMPANY_TYPES = [
  "Private",
  "Public listed",
  "Subsidiary",
  "Government",
  "Non-profit",
  "Partnership",
  "Cooperative",
  "Unknown",
] as const;

export const BUSINESS_STAGES = [
  "Startup",
  "Growth",
  "Established",
  "Public",
  "Dormant / Dissolved",
  "Unknown",
] as const;

export const BUSINESS_MODELS = [
  "B2B",
  "B2C",
  "B2B2C",
  "Marketplace",
  "Subscription / SaaS",
  "Services",
  "Manufacturing",
  "Distribution",
  "Unknown",
] as const;

export const EMPLOYEE_RANGES = [
  "1–10",
  "11–50",
  "51–200",
  "201–500",
  "501–1,000",
  "1,001–5,000",
  "5,001–10,000",
  "10,001+",
  "Unknown",
] as const;

export const DEPARTMENTS = [
  "Executive",
  "Finance",
  "IT & Security",
  "Engineering",
  "Product",
  "Operations",
  "Sales",
  "Marketing",
  "Customer Success",
  "HR",
  "Legal & Compliance",
  "Procurement",
  "Other",
] as const;

export const SENIORITIES = [
  "Owner / Founder",
  "C-level",
  "VP",
  "Director",
  "Head / Manager",
  "Senior IC",
  "Entry",
  "Unknown",
] as const;

export const EMAIL_STATUSES = ["Valid", "Accept-all", "Unknown", "Invalid"] as const;

export const RESEARCH_STATUSES = [
  "Draft",
  "Needs review",
  "Published",
  "Stale",
] as const;

/** 17 company fields from the production plan (§2) */
export const COMPANY_FIELDS = [
  { key: "orgName", label: "Company name" },
  { key: "websiteDomain", label: "Official website" },
  { key: "linkedinCompanyUrl", label: "LinkedIn company page" },
  { key: "hq", label: "Headquarters" },
  { key: "operatingCountries", label: "Countries / regions of operation" },
  { key: "industry", label: "Industry / sub-industry" },
  { key: "companyType", label: "Company type" },
  { key: "parentName", label: "Parent company / subsidiaries" },
  { key: "description", label: "Company description" },
  { key: "businessModel", label: "Business model" },
  { key: "productsServices", label: "Products and services" },
  { key: "targetCustomers", label: "Target customers" },
  { key: "mainMarkets", label: "Main markets served" },
  { key: "employeeCount", label: "Employee count" },
  { key: "employeeRange", label: "Employee range" },
  { key: "businessStage", label: "Business stage" },
  { key: "publicPhone", label: "Public business phone" },
] as const;

/** Built-in licensing register (config, not sample CRM data) */
export const DEFAULT_SOURCES = [
  { name: "Company website", category: "Company", fieldsSupplied: "Description, products, markets, locations, phone, published emails", licence: "Public pages; robots.txt honoured", personalData: true, refreshCadence: "Quarterly" },
  { name: "National company registry", category: "Company", fieldsSupplied: "Legal name, status, address, activity codes, legal form", licence: "Varies per registry — record per country before use", personalData: true, refreshCadence: "Daily–monthly" },
  { name: "GLEIF Golden Copy", category: "Company", fieldsSupplied: "Legal name, jurisdiction, legal form, parent relationships", licence: "Open (verify terms at onboarding)", personalData: false, refreshCadence: "Daily" },
  { name: "Wikidata", category: "Company", fieldsSupplied: "Website, inception, employees, parent, industry", licence: "CC0", personalData: false, refreshCadence: "Weekly" },
  { name: "People Data Labs free company dataset", category: "Company", fieldsSupplied: "Name, website, LinkedIn, country, founded, size, industry", licence: "CC BY 4.0 — attribution required", personalData: false, refreshCadence: "Quarterly" },
  { name: "Common Crawl", category: "Company", fieldsSupplied: "Archived website pages", licence: "Common Crawl terms", personalData: false, refreshCadence: "Monthly" },
  { name: "Company team / leadership pages", category: "Contact", fieldsSupplied: "Names, titles, locations, published work emails", licence: "Public pages; robots.txt honoured", personalData: true, refreshCadence: "Quarterly" },
  { name: "Registry officers", category: "Contact", fieldsSupplied: "Director / officer names and roles", licence: "Free; personal data — GDPR-equivalent controls", personalData: true, refreshCadence: "Monthly" },
  { name: "Public news / press releases", category: "Contact", fieldsSupplied: "Names, titles, appointments", licence: "Publisher terms; store facts + URL only", personalData: true, refreshCadence: "Daily" },
  { name: "Licensed B2B contact feed (optional)", category: "Contact", fieldsSupplied: "Names, titles, LinkedIn, work emails", licence: "Commercial contract with resale rights required", personalData: true, refreshCadence: "Contract-defined" },
] as const;

const PERSONAL_DOMAINS = new Set([
  "gmail.com","yahoo.com","hotmail.com","outlook.com","aol.com","icloud.com","proton.me","protonmail.com","yandex.com","mail.com",
]);

export function normalizeDomain(input: string): string {
  let d = input.trim().toLowerCase();
  d = d.replace(/^https?:\/\//, "").replace(/^www\./, "");
  d = d.split("/")[0].split("?")[0].split("#")[0];
  return d;
}

export function domainToUrl(domain: string): string {
  const d = normalizeDomain(domain);
  return d ? `https://${d}` : "";
}


export function isPersonalEmail(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  return PERSONAL_DOMAINS.has(domain);
}

export function classifyTitle(title: string): { department: string; seniority: string } {
  const t = ` ${title.toLowerCase()} `;
  let department = "Other";
  if (/(chief executive|ceo|founder|owner|president|managing director)/.test(t)) department = "Executive";
  else if (/(cfo|finance|account|treasur|controller)/.test(t)) department = "Finance";
  else if (/(ciso|cio|cto|security|information technology|\bit\b|cyber)/.test(t)) department = "IT & Security";
  else if (/(engineer|developer|architect|devops|software)/.test(t)) department = "Engineering";
  else if (/(product|ux|design)/.test(t)) department = "Product";
  else if (/(operations|coo|supply|logistics|delivery)/.test(t)) department = "Operations";
  else if (/(sales|revenue|business development|account executive|cro)/.test(t)) department = "Sales";
  else if (/(marketing|cmo|brand|growth|demand)/.test(t)) department = "Marketing";
  else if (/(customer success|support| cx )/.test(t)) department = "Customer Success";
  else if (/(human resources|\bhr\b|people|talent|recruit)/.test(t)) department = "HR";
  else if (/(legal|compliance|grc|risk|privacy|counsel)/.test(t)) department = "Legal & Compliance";
  else if (/(procurement|purchasing|sourcing|vendor)/.test(t)) department = "Procurement";

  let seniority = "Unknown";
  if (/(founder|owner|co-founder)/.test(t)) seniority = "Owner / Founder";
  else if (/(chief|\bceo\b|\bcfo\b|\bcto\b|\bcio\b|\bciso\b|\bcoo\b|\bcmo\b|president)/.test(t)) seniority = "C-level";
  else if (/(vice president|\bvp\b|svp|evp)/.test(t)) seniority = "VP";
  else if (/director/.test(t)) seniority = "Director";
  else if (/(head of|manager|lead)/.test(t)) seniority = "Head / Manager";
  else if (/(senior|sr\.|principal|specialist|consultant)/.test(t)) seniority = "Senior IC";
  else if (/(intern|associate|junior|analyst|executive)/.test(t)) seniority = "Entry";
  return { department, seniority };
}



export function employeeRangeFromCount(count: number | null | undefined): string | null {
  if (count == null || Number.isNaN(count)) return null;
  if (count <= 10) return "1–10";
  if (count <= 50) return "11–50";
  if (count <= 200) return "51–200";
  if (count <= 500) return "201–500";
  if (count <= 1000) return "501–1,000";
  if (count <= 5000) return "1,001–5,000";
  if (count <= 10000) return "5,001–10,000";
  return "10,001+";
}
