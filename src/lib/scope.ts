import type { SessionUser } from "./auth";
import { isManagerRole } from "./auth";

/* eslint-disable @typescript-eslint/no-explicit-any -- Prisma where filters; avoids broken Prisma namespace on CI */

/** Lead list filter: own leads only, unless manager. */
export function leadScopeWhere(user: SessionUser): any {
  if (isManagerRole(user.role)) return {};
  return { ownerId: user.id };
}

/** Meetings: owner, or lead owner, unless manager. */
export function meetingScopeWhere(user: SessionUser): any {
  if (isManagerRole(user.role)) return {};
  return {
    OR: [{ ownerId: user.id }, { lead: { ownerId: user.id } }],
  };
}

/** Demos: prep / conductor / lead owner, unless manager. */
export function demoScopeWhere(user: SessionUser): any {
  if (isManagerRole(user.role)) return {};
  return {
    OR: [
      { prepOwnerId: user.id },
      { conductedById: user.id },
      { lead: { ownerId: user.id } },
    ],
  };
}

export function notificationScopeWhere(user: SessionUser): any {
  if (isManagerRole(user.role)) return {};
  return { userId: user.id };
}
