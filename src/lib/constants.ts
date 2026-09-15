export const PHASES = [
  { id: 1, name: "Research", short: "P1", owner: "Research" },
  { id: 2, name: "Outreach", short: "P2", owner: "Outreach" },
  { id: 3, name: "Follow-Up", short: "P3", owner: "Outreach" },
  { id: 4, name: "Meeting", short: "P4", owner: "BDM" },
  { id: 5, name: "Requirement", short: "P5", owner: "BDM + Reviewer" },
  { id: 6, name: "Engagement Form", short: "P6", owner: "BDM" },
  { id: 7, name: "Demo", short: "P7", owner: "Presales" },
  { id: 8, name: "Onboarding", short: "P8", owner: "Delivery" },
] as const;

export function phaseName(phase: number) {
  return PHASES.find((p) => p.id === phase)?.name ?? `Phase ${phase}`;
}

export const DOC_TYPES = [
  "Engagement Form",
  "Proposal",
  "Contract",
  "NDA",
  "Requirement Doc",
  "Demo Recording",
  "Other",
] as const;

export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function healthTone(flag: string) {
  switch (flag) {
    case "Overdue":
    case "At Risk":
      return "danger";
    case "Due Today":
    case "Stalled":
      return "warn";
    default:
      return "ok";
  }
}
