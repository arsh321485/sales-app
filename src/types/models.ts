/** Lightweight shapes used when Prisma generated types are unavailable in CI. */

export type IdRow = { id: string };

export type UserLite = {
  id: string;
  name: string;
  email: string;
  role: string;
  teamId: string | null;
  isActive: boolean;
  createdAt?: Date;
  team?: { name: string } | null;
};

export type ProductLite = { id: string; name: string; code: string };

export type LeadListItem = {
  id: string;
  leadCode: string;
  currentPhase: number;
  phaseStatus: string;
  outcome: string;
  healthFlag: string;
  nextAction: string | null;
  organization: { orgName: string };
  product: { name: string; code?: string };
  owner?: { name: string } | null;
  primaryContact?: { fullName: string } | null;
};

export type NotificationLite = {
  id: string;
  title: string;
  body: string | null;
  priority: string;
};

export type MeetingToday = {
  id: string;
  scheduledAt: Date | null;
  meetingType: string | null;
  mode: string | null;
  lead: { organization: { orgName: string } };
};

export type DemoToday = {
  id: string;
  scheduledAt: Date | null;
  demoCode: string;
  status: string;
  lead: { organization: { orgName: string } };
};

export type PhaseHistoryRow = {
  id: string;
  fromPhase: number | null;
  toPhase: number;
  toStatus: string;
  createdAt: Date;
  changedBy: { name: string } | null;
};

export type MeetingRow = {
  id: string;
  meetingCode: string;
  scheduledAt: Date | null;
  status: string;
  ownerId: string | null;
};

export type DemoRow = {
  id: string;
  demoCode: string;
  scheduledAt: Date | null;
  status: string;
  prepOwnerId: string | null;
  conductedById: string | null;
};

export type DocumentRow = {
  id: string;
  title: string;
  documentType: string;
  versionNo: number;
};
