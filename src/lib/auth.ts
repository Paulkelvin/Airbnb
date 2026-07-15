import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import type { UserRole } from "@prisma/client";

export async function getSession() {
  return getServerSession(authOptions);
}

export async function getCurrentUser() {
  const session = await getSession();
  return session?.user ?? null;
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    throw new AuthError("UNAUTHORIZED", "You must be signed in");
  }
  return user;
}

export async function requireRole(...roles: UserRole[]) {
  const user = await requireAuth();
  const hasRole = user.roles.some((r) => roles.includes(r));
  if (!hasRole) {
    throw new AuthError("FORBIDDEN", "You do not have permission");
  }
  return user;
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
