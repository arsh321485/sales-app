import type { Prisma } from "@prisma/client";
import type { SessionUser } from "./auth";
import { isManagerRole } from "./auth";

/** Lead list filter: own leads only, unless manager. */
export function leadScopeWhere(user: SessionUser): Prisma.LeadWhereInput {
  if (isManagerRole(user.role)) return {};
  return { ownerId: user.id };
}

/** Meetings: owner, or lead owner, unless manager. */
export function meetingScopeWhere(user: SessionUser): Prisma.MeetingWhereInput {
  if (isManagerRole(user.role)) return {};
  return {
    OR: [{ ownerId: user.id }, { lead: { ownerId: user.id } }],
  };
}

/** Demos: prep / conductor / lead owner, unless manager. */
export function demoScopeWhere(user: SessionUser): Prisma.DemoWhereInput {
  if (isManagerRole(user.role)) return {};
  return {
    OR: [
      { prepOwnerId: user.id },
      { conductedById: user.id },
      { lead: { ownerId: user.id } },
    ],
  };
}

export function notificationScopeWhere(user: SessionUser): Prisma.NotificationWhereInput {
  if (isManagerRole(user.role)) return {};
  return { userId: user.id };
}
