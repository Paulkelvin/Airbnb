import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";
import { prisma } from "@/lib/db";

vi.mock("@/lib/auth", () => ({
  requireAuth: vi.fn(),
  requireAdmin: vi.fn().mockResolvedValue({ id: "ad000000-0000-4000-a000-000000000001", roles: ["ADMIN"] }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import {
  suspendUser,
  unsuspendUser,
  verifyUser,
  approveListing,
  rejectListing,
  adminUnpublishListing,
  adminForceBookingTransition,
  createPropertyType,
  updatePropertyType,
  createAmenity,
  updateAmenity,
  updatePlatformSetting,
} from "../actions";

const ADMIN_ID = "ad000000-0000-4000-a000-000000000001";
const USER_ID = "ad000000-0000-4000-a000-000000000002";
const HOST_ID = "ad000000-0000-4000-a000-000000000003";
const PT_ID = "ad000000-0000-4000-a000-000000000010";

let listingId: string;
let bookingId: string;

beforeAll(async () => {
  await prisma.user.upsert({
    where: { id: ADMIN_ID },
    create: { id: ADMIN_ID, email: "admin-actions-test@example.com", firstName: "Admin", lastName: "Test", roles: ["CUSTOMER", "ADMIN"] },
    update: {},
  });
  await prisma.user.upsert({
    where: { id: USER_ID },
    create: { id: USER_ID, email: "user-test@example.com", firstName: "User", lastName: "Test", roles: ["CUSTOMER"], status: "ACTIVE" },
    update: { status: "ACTIVE", isVerified: false },
  });
  await prisma.user.upsert({
    where: { id: HOST_ID },
    create: { id: HOST_ID, email: "host-test-admin@example.com", firstName: "Host", lastName: "Test", roles: ["CUSTOMER", "HOST"] },
    update: {},
  });
  await prisma.propertyType.upsert({
    where: { id: PT_ID },
    create: { id: PT_ID, name: "AdminTestHouse", slug: "admintesthouse" },
    update: {},
  });
  const listing = await prisma.listing.create({
    data: {
      hostId: HOST_ID,
      propertyTypeId: PT_ID,
      title: "Admin Test Listing",
      slug: `admin-test-listing-${Date.now()}`,
      description: "Test listing for admin actions",
      rentalType: "SHORT_TERM",
      bedrooms: 1,
      bathrooms: 1,
      maxOccupants: 2,
      currency: "USD",
      status: "PENDING_REVIEW",
      nightlyPrice: 100,
      minNights: 1,
      maxNights: 30,
      checkInTime: "15:00",
      checkOutTime: "11:00",
      cancellationPolicy: "FLEXIBLE",
    },
  });
  listingId = listing.id;

  const booking = await prisma.booking.create({
    data: {
      listingId,
      guestId: USER_ID,
      hostId: HOST_ID,
      rentalType: "SHORT_TERM",
      status: "DISPUTED",
      currency: "USD",
      idempotencyKey: `admin-test-${Date.now()}`,
      checkInDate: new Date("2026-08-01"),
      checkOutDate: new Date("2026-08-05"),
      nights: 4,
      nightlyRateSnapshot: 100,
      totalPrice: 400,
    },
  });
  bookingId = booking.id;
});

afterAll(async () => {
  await prisma.auditLog.deleteMany({ where: { actorId: ADMIN_ID } });
  await prisma.review.deleteMany({ where: { bookingId } });
  await prisma.payment.deleteMany({ where: { bookingId } });
  await prisma.booking.deleteMany({ where: { id: bookingId } });
  await prisma.listing.deleteMany({ where: { id: listingId } });
  await prisma.amenity.deleteMany({ where: { name: { startsWith: "AdminTest" } } });
  await prisma.propertyType.deleteMany({ where: { id: PT_ID } });
});

describe("User Management", () => {
  beforeEach(async () => {
    await prisma.user.update({ where: { id: USER_ID }, data: { status: "ACTIVE", isVerified: false } });
  });

  it("suspends an active user", async () => {
    const result = await suspendUser(USER_ID);
    expect(result).toEqual({ success: true, data: { id: USER_ID } });
    const user = await prisma.user.findUnique({ where: { id: USER_ID } });
    expect(user!.status).toBe("SUSPENDED");
  });

  it("rejects suspending an already-suspended user", async () => {
    await prisma.user.update({ where: { id: USER_ID }, data: { status: "SUSPENDED" } });
    const result = await suspendUser(USER_ID);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe("INVALID_STATE");
  });

  it("unsuspends a suspended user", async () => {
    await prisma.user.update({ where: { id: USER_ID }, data: { status: "SUSPENDED" } });
    const result = await unsuspendUser(USER_ID);
    expect(result).toEqual({ success: true, data: { id: USER_ID } });
    const user = await prisma.user.findUnique({ where: { id: USER_ID } });
    expect(user!.status).toBe("ACTIVE");
  });

  it("verifies an unverified user", async () => {
    const result = await verifyUser(USER_ID);
    expect(result).toEqual({ success: true, data: { id: USER_ID } });
    const user = await prisma.user.findUnique({ where: { id: USER_ID } });
    expect(user!.isVerified).toBe(true);
  });

  it("rejects verifying an already-verified user", async () => {
    await prisma.user.update({ where: { id: USER_ID }, data: { isVerified: true } });
    const result = await verifyUser(USER_ID);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe("INVALID_STATE");
  });

  it("returns NOT_FOUND for nonexistent user", async () => {
    const result = await suspendUser("00000000-0000-4000-a000-000000000099");
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe("NOT_FOUND");
  });
});

describe("Listing Moderation", () => {
  beforeEach(async () => {
    await prisma.listing.update({ where: { id: listingId }, data: { status: "PENDING_REVIEW", publishedAt: null } });
  });

  it("approves a pending listing and sets publishedAt", async () => {
    const result = await approveListing(listingId);
    expect(result).toEqual({ success: true, data: { id: listingId } });
    const listing = await prisma.listing.findUnique({ where: { id: listingId } });
    expect(listing!.status).toBe("PUBLISHED");
    expect(listing!.publishedAt).toBeTruthy();
  });

  it("rejects a pending listing", async () => {
    const result = await rejectListing(listingId, "Content violation");
    expect(result).toEqual({ success: true, data: { id: listingId } });
    const listing = await prisma.listing.findUnique({ where: { id: listingId } });
    expect(listing!.status).toBe("REJECTED");
  });

  it("refuses to approve a non-pending listing", async () => {
    await prisma.listing.update({ where: { id: listingId }, data: { status: "PUBLISHED" } });
    const result = await approveListing(listingId);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe("INVALID_STATE");
  });

  it("unpublishes a published listing", async () => {
    await prisma.listing.update({ where: { id: listingId }, data: { status: "PUBLISHED" } });
    const result = await adminUnpublishListing(listingId, "Policy violation");
    expect(result).toEqual({ success: true, data: { id: listingId } });
    const listing = await prisma.listing.findUnique({ where: { id: listingId } });
    expect(listing!.status).toBe("PAUSED");
  });
});

describe("Booking Dispute Resolution", () => {
  beforeEach(async () => {
    await prisma.booking.update({ where: { id: bookingId }, data: { status: "DISPUTED" } });
  });

  it("force-transitions a disputed booking to COMPLETED", async () => {
    const result = await adminForceBookingTransition(bookingId, "COMPLETED", "Dispute resolved in guest's favor");
    expect(result).toEqual({ success: true, data: { id: bookingId } });
    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    expect(booking!.status).toBe("COMPLETED");
  });

  it("creates an audit log entry for force transitions", async () => {
    await adminForceBookingTransition(bookingId, "CANCELLED_BY_HOST", "Dispute resolved");
    const log = await prisma.auditLog.findFirst({
      where: { actorId: ADMIN_ID, action: "booking.forceTransition", targetId: bookingId },
      orderBy: { createdAt: "desc" },
    });
    expect(log).toBeTruthy();
    expect(log!.metadata).toMatchObject({ from: "DISPUTED", to: "CANCELLED_BY_HOST", reason: "Dispute resolved" });
  });
});

describe("Taxonomy Management", () => {
  beforeAll(async () => {
    await prisma.amenity.deleteMany({ where: { name: { startsWith: "AdminTest" } } });
    await prisma.propertyType.deleteMany({ where: { name: { startsWith: "AdminTest" }, id: { not: PT_ID } } });
  });

  it("creates a property type with auto-slug", async () => {
    const result = await createPropertyType({ name: "AdminTestVilla" });
    expect(result.success).toBe(true);
    if (result.success) {
      const pt = await prisma.propertyType.findUnique({ where: { id: result.data.id } });
      expect(pt!.slug).toBe("admintestvilla");
    }
  });

  it("rejects duplicate property type names", async () => {
    await createPropertyType({ name: "AdminTestDupePT" });
    const result = await createPropertyType({ name: "AdminTestDupePT" });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe("DUPLICATE");
  });

  it("toggles property type active status", async () => {
    const createResult = await createPropertyType({ name: "AdminTestToggle" });
    expect(createResult.success).toBe(true);
    if (!createResult.success) return;

    const result = await updatePropertyType(createResult.data.id, { isActive: false });
    expect(result.success).toBe(true);
    const pt = await prisma.propertyType.findUnique({ where: { id: createResult.data.id } });
    expect(pt!.isActive).toBe(false);
  });

  it("creates an amenity", async () => {
    const result = await createAmenity({ name: "AdminTestPool", category: "OUTDOOR" });
    expect(result.success).toBe(true);
    if (result.success) {
      const amenity = await prisma.amenity.findUnique({ where: { id: result.data.id } });
      expect(amenity!.name).toBe("AdminTestPool");
    }
  });

  it("rejects duplicate amenity names", async () => {
    await createAmenity({ name: "AdminTestDupeAmenity" });
    const result = await createAmenity({ name: "AdminTestDupeAmenity" });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe("DUPLICATE");
  });

  it("updates amenity active status", async () => {
    const createResult = await createAmenity({ name: "AdminTestSauna" });
    expect(createResult.success).toBe(true);
    if (!createResult.success) return;

    const result = await updateAmenity(createResult.data.id, { isActive: false });
    expect(result.success).toBe(true);
    const amenity = await prisma.amenity.findUnique({ where: { id: createResult.data.id } });
    expect(amenity!.isActive).toBe(false);
  });
});

describe("Platform Settings", () => {
  afterAll(async () => {
    await prisma.platformSetting.deleteMany({ where: { key: "testAdminKey" } });
  });

  it("creates a new setting via upsert", async () => {
    const result = await updatePlatformSetting("testAdminKey", "testValue");
    expect(result).toEqual({ success: true, data: null });
    const setting = await prisma.platformSetting.findUnique({ where: { key: "testAdminKey" } });
    expect(setting!.value).toBe("testValue");
  });

  it("updates an existing setting", async () => {
    await updatePlatformSetting("testAdminKey", "first");
    const result = await updatePlatformSetting("testAdminKey", "second");
    expect(result).toEqual({ success: true, data: null });
    const setting = await prisma.platformSetting.findUnique({ where: { key: "testAdminKey" } });
    expect(setting!.value).toBe("second");
  });
});
