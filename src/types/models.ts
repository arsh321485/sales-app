/** Lightweight shapes used when Prisma generated types are unavailable in CI. */

export type UserLite = {
  id: string;
  name: string;
  email: string;
  role: string;
  teamId: string | null;
  isActive: boolean;
  team?: { name: string } | null;
};

export type ProductLite = { id: string; name: string; code: string };

export type LeadListItem = {
  id: string;
  leadCode: string;
  salesStage: string;
  temperature: string | null;
  nextAction: string | null;
  organization: { orgName: string };
  product: { name: string; code?: string };
  owner?: { name: string } | null;
  contact?: { fullName: string } | null;
};
