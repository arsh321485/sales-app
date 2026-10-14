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

/** Next Action choices on lead / outreach */
export const NEXT_ACTIONS = [
  "follow-up",
  "to schedule a meeting",
  "demo",
] as const;

/** Next Phase on My Leads */
export const NEXT_PHASES = [
  "Follow-up 1",
  "Follow-up 2",
  "Meeting",
  "Demo",
] as const;

export const OUTREACH_CHANNELS = [
  "LinkedIn",
  "Email",
  "Call",
  "WhatsApp",
  "Event",
  "Manual",
  "Other",
] as const;

export const OUTREACH_STATUSES = [
  "Connected",
  "Replied",
  "Pending",
  "No Response",
  "Other",
] as const;

export const RESPONSE_STATUSES = [
  "Awaiting",
  "Positive",
  "Neutral",
  "Negative",
  "No Response",
] as const;

export const QUALIFICATION_STATUSES = [
  "Pending",
  "Qualified",
  "Unqualified",
] as const;

/** Display label for follow-up sequence: Follow-up, Follow-up 1, Follow-up 2 */
export function followUpLabel(followUpNumber: number) {
  if (followUpNumber <= 1) return "Follow-up";
  if (followUpNumber === 2) return "Follow-up 1";
  if (followUpNumber === 3) return "Follow-up 2";
  return `Follow-up ${followUpNumber - 1}`;
}

/** Default Microsoft Teams meeting link (override with TEAMS_MEETING_URL in .env) */
export function defaultTeamsMeetingUrl() {
  return (
    process.env.NEXT_PUBLIC_TEAMS_MEETING_URL ||
    process.env.TEAMS_MEETING_URL ||
    "https://teams.microsoft.com/l/meetup-join/"
  );
}

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
