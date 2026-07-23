import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import type { UserRole } from "@prisma/client";

/**
 * Role model: GUEST (anonymous, unauthenticated — not a stored UserRole) <
 * CUSTOMER (base authenticated capability: book, favorite, message, review,
 * manage own profile) < HOST (customer capabilities + listing management) <
 * ADMIN (platform-wide). HOST/ADMIN users carry CUSTOMER alongside their
 * elevated role in `User.roles`, and ADMIN always bypasses role checks below.
 */

export async function getSession() {
  return getServerSession(authOptions);
}

export async function getCurrentUser() {
  const session = await getSession();
  if (!session?.user) return null;

  // The session comes from a 30-day JWT that only gets refreshed on login
  // or an explicit client-side update() call — an admin suspending a user
  // or revoking their admin role otherwise has no effect until that JWT
  // happens to expire, leaving the suspended/demoted account with full
  // access in the meantime. Re-checking status/roles against the DB on
  // every lookup (an indexed PK read) makes those admin actions take
  // effect immediately instead.
  const current = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { status: true, roles: true },
  });
  if (!current || current.status !== "ACTIVE") return null;

  return { ...session.user, roles: current.roles };
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    throw new AuthError("UNAUTHORIZED", "You must be signed in");
  }
  return user;
}

/** Any authenticated user has customer-level capabilities — alias for requireAuth(). */
export async function requireCustomer() {
  return requireAuth();
}

export async function requireRole(...roles: UserRole[]) {
  const user = await requireAuth();
  const hasRole =
    user.roles.includes("ADMIN") || user.roles.some((r) => roles.includes(r));
  if (!hasRole) {
    throw new AuthError("FORBIDDEN", "You do not have permission");
  }
  return user;
}

export async function requireHost() {
  return requireRole("HOST");
}

export async function requireAdmin() {
  return requireRole("ADMIN");
}

export async function requireOwnership(resourceOwnerId: string) {
  const user = await requireAuth();
  if (user.id !== resourceOwnerId && !user.roles.includes("ADMIN")) {
    throw new AuthError("FORBIDDEN", "You do not own this resource");
  }
  return user;
}

export class AuthError extends Error {
  constructor(
    public code: "UNAUTHORIZED" | "FORBIDDEN",
    message: string,
  ) {
    super(message);
    this.name = "AuthError";
  }
}
