import { describe, it, expect } from "vitest";
import { getDefaultDashboardPath } from "@/lib/dashboard-path";

describe("getDefaultDashboardPath", () => {
  it("routes a CUSTOMER-only user to the bookings dashboard", () => {
    expect(getDefaultDashboardPath(["CUSTOMER"])).toBe("/account-bookings");
  });

  it("routes a HOST (who also carries CUSTOMER per ADR-017) to the listings dashboard", () => {
    expect(getDefaultDashboardPath(["CUSTOMER", "HOST"])).toBe("/account-listings");
  });

  it("routes an ADMIN to the account page (no dedicated admin dashboard yet)", () => {
    expect(getDefaultDashboardPath(["ADMIN"])).toBe("/account");
  });

  it("gives ADMIN priority over HOST and CUSTOMER when a user carries all three", () => {
    expect(getDefaultDashboardPath(["CUSTOMER", "HOST", "ADMIN"])).toBe("/account");
  });

  it("gives HOST priority over CUSTOMER", () => {
    expect(getDefaultDashboardPath(["HOST", "CUSTOMER"])).toBe("/account-listings");
  });

  it("falls back to the CUSTOMER dashboard for an empty roles array", () => {
    expect(getDefaultDashboardPath([])).toBe("/account-bookings");
  });
});
