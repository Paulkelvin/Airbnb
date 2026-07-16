import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db";

/**
 * Confirms notify() is actually wired into the domain actions that should
 * trigger it (Platform Architecture Blueprint §7's "event-driven ... a
 * domain action emits an event"), not just that notify() itself works in
 * isolation (see notify.test.ts). Each case drives one real call site
 * end-to-end against the real database and asserts the resulting
 * Notification row(s).
 */

const sendMock = vi.fn().mockResolvedValue({ success: true, providerMessageId: "stub_1" });
vi.mock("@/lib/notifications", () => ({
  getEmailProvider: () => ({ send: sendMock }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const HOST_ID = "cc000000-0000-4000-a000-000000000001";
const GUEST_ID = "cc000000-0000-4000-a000-000000000002";
const ADMIN_ID = "cc000000-0000-4000-a000-000000000003";
const PROPERTY_TYPE_ID = "cc000000-0000-4000-a000-000000000010";

const authState: { current: { id: string; roles: string[]; firstName: string; lastName: string } } = {
  current: { id: GUEST_ID, roles: ["CUSTOMER"], firstName: "Guest", lastName: "Test" },
};

vi.mock("@/lib/auth", () => ({
  requireAuth: vi.fn(() => Promise.resolve(authState.current)),
  requireOwnership: vi.fn(() => Promise.resolve(authState.current)),
  requireAdmin: vi.fn(() => Promise.resolve(authState.current)),
  AuthError: class AuthError extends Error {
    code: string;
    constructor(code: string, message: string) {
      super(message);
      this.code = code;
    }
  },
}));

import { sendMessage } from "@/modules/messaging/actions";
import { createInquiry } from "@/modules/inquiries/actions";
import { approveListing, rejectListing } from "@/modules/admin/actions";

let listingId: string;

beforeAll(async () => {
  await prisma.user.upsert({
    where: { id: HOST_ID },
    create: { id: HOST_ID, email: "retrofit-host@example.com", firstName: "Host", lastName: "Test", roles: ["CUSTOMER", "HOST"] },
    update: {},
  });
  await prisma.user.upsert({
    where: { id: GUEST_ID },
    create: { id: GUEST_ID, email: "retrofit-guest@example.com", firstName: "Guest", lastName: "Test", roles: ["CUSTOMER"] },
    update: {},
  });
  await prisma.user.upsert({
    where: { id: ADMIN_ID },
    create: { id: ADMIN_ID, email: "retrofit-admin@example.com", firstName: "Admin", lastName: "Test", roles: ["CUSTOMER", "ADMIN"] },
    update: {},
  });
  await prisma.propertyType.upsert({
    where: { id: PROPERTY_TYPE_ID },
    create: { id: PROPERTY_TYPE_ID, name: "RetrofitTestType", slug: "retrofit-test-type" },
    update: {},
  });
  const listing = await prisma.listing.create({
    data: {
      hostId: HOST_ID,
      propertyTypeId: PROPERTY_TYPE_ID,
      title: "Retrofit Test Listing",
      slug: `retrofit-test-listing-${Date.now()}`,
      description: "test",
      rentalType: "SHORT_TERM",
      bedrooms: 1,
      bathrooms: 1,
      maxOccupants: 2,
      currency: "USD",
      status: "PUBLISHED",
      nightlyPrice: 100,
      minNights: 1,
      maxNights: 30,
      checkInTime: "15:00",
      checkOutTime: "11:00",
      cancellationPolicy: "FLEXIBLE",
    },
  });
  listingId = listing.id;
});

afterAll(async () => {
  // Fixed test UUIDs mean the rate-limit keys below are shared across every
  // run of this file — without this cleanup, repeated `npm test` runs within
  // the same hour eventually exhaust INQUIRY_CREATE/MESSAGE_SEND's real caps
  // and this file starts failing with RATE_LIMITED, not a real regression.
  await prisma.rateLimitHit.deleteMany({ where: { key: { in: [`inquiry:${GUEST_ID}`, `message:${HOST_ID}`] } } });
  await prisma.notification.deleteMany({ where: { userId: { in: [HOST_ID, GUEST_ID, ADMIN_ID] } } });
  await prisma.message.deleteMany({ where: { conversation: { listingId } } });
  await prisma.conversationParticipant.deleteMany({ where: { conversation: { listingId } } });
  await prisma.inquiry.deleteMany({ where: { listingId } });
  await prisma.conversation.deleteMany({ where: { listingId } });
  await prisma.auditLog.deleteMany({ where: { actorId: ADMIN_ID } });
  await prisma.listing.deleteMany({ where: { id: listingId } });
  await prisma.propertyType.deleteMany({ where: { id: PROPERTY_TYPE_ID } });
  await prisma.user.deleteMany({ where: { id: { in: [HOST_ID, GUEST_ID, ADMIN_ID] } } });
});

describe("retrofit: NEW_INQUIRY", () => {
  it("notifies the host when a guest sends an inquiry", async () => {
    authState.current = { id: GUEST_ID, roles: ["CUSTOMER"], firstName: "Guest", lastName: "Test" };

    const result = await createInquiry({ listingId, message: "Is this available in August?" });
    expect(result.success).toBe(true);

    const notification = await prisma.notification.findFirst({
      where: { userId: HOST_ID, type: "NEW_INQUIRY", channel: "IN_APP" },
    });
    expect(notification).toBeTruthy();
    expect((notification!.payload as Record<string, unknown>).listingTitle).toBe("Retrofit Test Listing");
  });
});

describe("retrofit: NEW_MESSAGE", () => {
  it("notifies the other conversation participant, not the sender", async () => {
    authState.current = { id: HOST_ID, roles: ["CUSTOMER", "HOST"], firstName: "Host", lastName: "Test" };

    const conversation = await prisma.conversation.findFirst({ where: { listingId }, orderBy: { createdAt: "desc" } });
    expect(conversation).toBeTruthy();

    const result = await sendMessage({ conversationId: conversation!.id, body: "Yes, it's available!" });
    expect(result.success).toBe(true);

    const guestNotified = await prisma.notification.findFirst({
      where: { userId: GUEST_ID, type: "NEW_MESSAGE", channel: "IN_APP" },
    });
    expect(guestNotified).toBeTruthy();

    const hostSelfNotified = await prisma.notification.findFirst({
      where: { userId: HOST_ID, type: "NEW_MESSAGE", channel: "IN_APP" },
    });
    expect(hostSelfNotified).toBeNull();
  });
});

describe("retrofit: LISTING_APPROVED / LISTING_REJECTED", () => {
  it("notifies the host when their listing is approved", async () => {
    await prisma.listing.update({ where: { id: listingId }, data: { status: "PENDING_REVIEW" } });

    const result = await approveListing(listingId);
    expect(result.success).toBe(true);

    const notification = await prisma.notification.findFirst({
      where: { userId: HOST_ID, type: "LISTING_APPROVED", channel: "IN_APP" },
    });
    expect(notification).toBeTruthy();
  });

  it("notifies the host when their listing is rejected", async () => {
    await prisma.listing.update({ where: { id: listingId }, data: { status: "PENDING_REVIEW" } });

    const result = await rejectListing(listingId, "Photos too dark");
    expect(result.success).toBe(true);

    const notification = await prisma.notification.findFirst({
      where: { userId: HOST_ID, type: "LISTING_REJECTED", channel: "IN_APP" },
      orderBy: { createdAt: "desc" },
    });
    expect(notification).toBeTruthy();
    expect((notification!.payload as Record<string, unknown>).reason).toBe("Photos too dark");
  });
});
