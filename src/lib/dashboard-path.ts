import type { UserRole } from "@prisma/client";
import type { Route } from "@/routers/types";

// Priority order when a user carries multiple roles (ADR-017: HOST implies
// CUSTOMER, so a host is never CUSTOMER-only) — most-elevated role wins.
const ROLE_PRIORITY: UserRole[] = ["ADMIN", "HOST", "CUSTOMER"];

const ROLE_DASHBOARD_PATH: Record<UserRole, Route> = {
  ADMIN: "/admin" as Route,
  HOST: "/account-listings" as Route,
  CUSTOMER: "/" as Route,
};

/**
 * Post-authentication landing page, based on the user's highest-priority
 * role. A single lookup point so this can later be swapped for "remember
 * the user's last active dashboard" without touching every call site.
 */
export function getDefaultDashboardPath(roles: UserRole[]): Route {
  const primary = ROLE_PRIORITY.find((role) => roles.includes(role)) ?? "CUSTOMER";
  return ROLE_DASHBOARD_PATH[primary];
}
