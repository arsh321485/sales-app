import type { SessionUser } from "./auth";
import { canViewAllLeads } from "./constants";

/* eslint-disable @typescript-eslint/no-explicit-any */

export function leadScopeWhere(user: SessionUser): any {
  if (canViewAllLeads(user.role)) return {};
  return { ownerId: user.id };
}

export function ownerOrAssignedWhere(user: SessionUser, ownerField = "ownerId"): any {
  if (canViewAllLeads(user.role)) return {};
  return { [ownerField]: user.id };
}

/** Meetings scoped via owner or lead ownership */
export function meetingScopeWhere(user: SessionUser): any {
  if (canViewAllLeads(user.role)) return {};
  return {
    OR: [{ ownerId: user.id }, { lead: { ownerId: user.id } }],
  };
}

export function demoScopeWhere(user: SessionUser): any {
  if (canViewAllLeads(user.role)) return {};
  return {
    OR: [{ ownerId: user.id }, { lead: { ownerId: user.id } }],
  };
}
