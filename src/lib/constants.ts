export const SALES_STAGES = [
  "New",
  "Qualified",
  "Engaged",
  "Opportunity",
  "Negotiation",
  "Won",
  "Lost",
  "OnHold",
] as const;

export type SalesStage = (typeof SALES_STAGES)[number];

export const TEMPERATURES = ["Hot", "Warm", "Cold"] as const;

export const ROLES = [
  "SuperAdmin",
  "SalesManager",
  "SalesMember",
  "SocialMediaManager",
  "Viewer",
] as const;

export const REQUEST_TYPES = [
  { code: "proposal", label: "Proposal" },
  { code: "pricing", label: "Pricing" },
  { code: "presentation", label: "Presentation" },
  { code: "company_profile", label: "Company profile" },
  { code: "brochure", label: "Brochure" },
  { code: "case_study", label: "Case study" },
  { code: "technical_doc", label: "Technical documentation" },
  { code: "nda", label: "NDA" },
  { code: "sow", label: "SOW" },
  { code: "agreement", label: "Agreement" },
  { code: "other", label: "Other" },
] as const;

export const RESOURCE_TYPES = [
  "Proposal",
  "Presentation",
  "Pricing",
  "Case Study",
  "Other",
] as const;

export const DEFAULT_PRODUCTS = [
  { code: "VF", prefix: "VF", name: "VaptFix" },
  { code: "GM", prefix: "GM", name: "GRCMentor" },
  { code: "GD", prefix: "GD", name: "GRCDepartment" },
  { code: "AI", prefix: "AI", name: "AIDL" },
  { code: "TMP", prefix: "TMP", name: "TestMyPlan" },
] as const;

export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function isSalesRole(role: string) {
  return ["SuperAdmin", "SalesManager", "SalesMember"].includes(role);
}

export function canManageUsers(role: string) {
  return role === "SuperAdmin" || role === "SalesManager";
}

export function canViewAllLeads(role: string) {
  return ["SuperAdmin", "SalesManager", "Viewer"].includes(role);
}

export const DOC_TYPES = [
  "Proposal",
  "Presentation",
  "Pricing",
  "Case Study",
  "NDA",
  "SOW",
  "Agreement",
  "Technical",
  "Other",
] as const;
