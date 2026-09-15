import { compare, hash } from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "./db";

export const SESSION_COOKIE = "pipeline_user_id";

/** MongoDB ObjectId is 24 hex chars. Reject old SQLite cuid cookies. */
export function isMongoObjectId(value: string) {
  return /^[a-fA-F0-9]{24}$/.test(value);
}

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  teamId: string | null;
  teamName: string | null;
};

export function isManagerRole(role: string) {
  return role === "Head" || role === "Admin";
}

export async function hashPassword(password: string) {
  return hash(password, 12);
}

export async function verifyPassword(password: string, passwordHash: string) {
  return compare(password, passwordHash);
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const userId = jar.get(SESSION_COOKIE)?.value;
  if (!userId) return null;

  // Old SQLite sessions used cuid IDs — ignore them so the app redirects to login
  if (!isMongoObjectId(userId)) return null;

  try {
    const user = await prisma.user.findFirst({
      where: { id: userId, isActive: true },
      include: { team: true },
    });
    if (!user) return null;

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      teamId: user.teamId,
      teamName: user.team?.name ?? null,
    };
  } catch {
    return null;
  }
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireManager(): Promise<SessionUser> {
  const user = await requireUser();
  if (!isManagerRole(user.role)) redirect("/");
  return user;
}

export function scopeOwnerId(user: SessionUser): string | undefined {
  if (isManagerRole(user.role)) return undefined;
  return user.id;
}
