import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { payoutForPayment } from "../actions";

/**
 * Integration test against the real (local Postgres) database — exercises
 * payoutForPayment's actual business logic (eligibility checks, idempotency,
 * subtotal-vs-total amount computation) end-to-end. Only the auth gate and
 * the PaymentProvider are mocked, since those are exercised separately
 * (stripe-provider.test.ts covers provider.payout() itself; the webhook E2E
 * pass covered live HTTP + real DB side effects for the sync paths).
 */

const ADMIN_ID = "aaaaaaaa-0000-0000-0000-000000000010";

vi.mock("@/lib/auth", () => ({
  requireAdmin: vi.fn().mockResolvedValue({ id: "aaaaaaaa-0000-0000-0000-000000000010", roles: ["ADMIN"] }),
}));

// revalidatePath requires a real Next.js request-rendering context, which a
// standalone vitest process doesn't have — irrelevant to the business logic under test.
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const payoutMock = vi.fn();
vi.mock("@/lib/payments", () => ({
  getPaymentProvider: () => ({ payout: payoutMock }),
}));

const LISTING_ID = "aaaaaaaa-0000-0000-0000-000000000001";
const HOST_ID = "aaaaaaaa-0000-0000-0000-000000000002";
const HOST_NO_STRIPE_ID = "aaaaaaaa-0000-0000-0000-000000000003";
const GUEST_ID = "aaaaaaaa-0000-0000-0000-000000000004";
const PROPERTY_TYPE_ID = "aaaaaaaa-0000-0000-0000-000000000005";
const BOOKING_ID = "aaaaaaaa-0000-0000-0000-000000000006";
const PAYMENT_ID = "aaaaaaaa-0000-0000-0000-000000000007";
const BOOKING_NO_STRIPE_ID = "aaaaaaaa-0000-0000-0000-000000000008";
const PAYMENT_NO_STRIPE_ID = "aaaaaaaa-0000-0000-0000-000000000009";

beforeAll(async () => {
  await prisma.propertyType.upsert({
    where: { id: PROPERTY_TYPE_ID },
    create: { id: PROPERTY_TYPE_ID, name: "__test_payout_type", slug: "__test-payout-type" },
    update: {},
  });
  await prisma.user.upsert({
    where: { id: HOST_ID },
    create: {
      id: HOST_ID,
      email: "payout-test-host@example.com",
      firstName: "Payout",
      lastName: "Host",
      roles: ["CUSTOMER", "HOST"],
      payoutAccountRef: "acct_test_payout",
    },
    update: { payoutAccountRef: "acct_test_payout" },
  });
  await prisma.user.upsert({
    where: { id: HOST_NO_STRIPE_ID },
    create: {
      id: HOST_NO_STRIPE_ID,
      email: "payout-test-host-nostripe@example.com",
      firstName: "NoStripe",
      lastName: "Host",
      roles: ["CUSTOMER", "HOST"],
    },
    update: { payoutAccountRef: null },
  });
  await prisma.user.upsert({
    where: { id: GUEST_ID },
    create: {
      id: GUEST_ID,
      email: "payout-test-guest@example.com",
      firstName: "Payout",
      lastName: "Guest",
      roles: ["CUSTOMER"],
    },
    update: {},
  });
  await prisma.user.upsert({
    where: { id: ADMIN_ID },
    create: {
      id: ADMIN_ID,
      email: "payout-test-admin@example.com",
      firstName: "Payout",
      lastName: "Admin",
      roles: ["CUSTOMER", "ADMIN"],
    },
    update: {},
  });
  await prisma.listing.upsert({
    where: { id: LISTING_ID },
    create: {
      id: LISTING_ID,
      hostId: HOST_ID,
      propertyTypeId: PROPERTY_TYPE_ID,
      title: "__test payout listing",
      slug: "__test-payout-listing",
      description: "test",
      rentalType: "SHORT_TERM",
      bedrooms: 1,
      bathrooms: 1,
      maxOccupants: 2,
      currency: "USD",
      status: "DRAFT",
    },
    update: {},
  });
  await prisma.booking.upsert({
    where: { id: BOOKING_ID },
    create: {
      id: BOOKING_ID,
      listingId: LISTING_ID,
      guestId: GUEST_ID,
      hostId: HOST_ID,
      rentalType: "SHORT_TERM",
      status: "CONFIRMED",
      currency: "USD",
      idempotencyKey: "test-payout-key-1",
      checkInDate: new Date("2026-10-01"),
      checkOutDate: new Date("2026-10-05"),
      nights: 4,
      guestCount: 1,
      nightlyRateSnapshot: 100,
      subtotal: 400,
      serviceFee: 40,
      totalPrice: 440,
    },
    update: {},
  });
  await prisma.payment.upsert({
    where: { id: PAYMENT_ID },
    create: {
      id: PAYMENT_ID,
      bookingId: BOOKING_ID,
      payerUserId: GUEST_ID,
      payeeUserId: HOST_ID,
      type: "CHARGE",
      amount: 44000,
      currency: "USD",
      provider: "STRIPE_CONNECT",
      providerTransactionRef: "pi_test_payout_1",
      status: "SUCCEEDED",
    },
    update: { status: "SUCCEEDED" },
  });

  await prisma.booking.upsert({
    where: { id: BOOKING_NO_STRIPE_ID },
    create: {
      id: BOOKING_NO_STRIPE_ID,
      listingId: LISTING_ID,
      guestId: GUEST_ID,
      hostId: HOST_NO_STRIPE_ID,
      rentalType: "SHORT_TERM",
      status: "CONFIRMED",
      currency: "USD",
      idempotencyKey: "test-payout-key-2",
      checkInDate: new Date("2026-10-10"),
      checkOutDate: new Date("2026-10-12"),
      nights: 2,
      guestCount: 1,
      nightlyRateSnapshot: 100,
      subtotal: 200,
      serviceFee: 20,
      totalPrice: 220,
    },
    update: {},
  });
  await prisma.payment.upsert({
    where: { id: PAYMENT_NO_STRIPE_ID },
    create: {
      id: PAYMENT_NO_STRIPE_ID,
      bookingId: BOOKING_NO_STRIPE_ID,
      payerUserId: GUEST_ID,
      payeeUserId: HOST_NO_STRIPE_ID,
      type: "CHARGE",
      amount: 22000,
      currency: "USD",
      provider: "STRIPE_CONNECT",
      providerTransactionRef: "pi_test_payout_2",
      status: "SUCCEEDED",
    },
    update: { status: "SUCCEEDED" },
  });
});

afterAll(async () => {
  await prisma.auditLog.deleteMany({ where: { actorId: ADMIN_ID } });
  await prisma.notification.deleteMany({ where: { userId: { in: [HOST_ID, HOST_NO_STRIPE_ID] } } });
  await prisma.payment.deleteMany({ where: { bookingId: { in: [BOOKING_ID, BOOKING_NO_STRIPE_ID] } } });
  await prisma.booking.deleteMany({ where: { id: { in: [BOOKING_ID, BOOKING_NO_STRIPE_ID] } } });
  await prisma.listing.deleteMany({ where: { id: LISTING_ID } });
  await prisma.user.deleteMany({ where: { id: { in: [HOST_ID, HOST_NO_STRIPE_ID, GUEST_ID, ADMIN_ID] } } });
  await prisma.propertyType.deleteMany({ where: { id: PROPERTY_TYPE_ID } });
  await prisma.$disconnect();
});

describe("payoutForPayment", () => {
  it("pays out the booking's subtotal (excludes the guest service fee), not the full charge", async () => {
    payoutMock.mockResolvedValueOnce({ providerTransactionRef: "tr_test_1", status: "SUCCEEDED" });

    const result = await payoutForPayment(PAYMENT_ID);

    expect(result.success).toBe(true);
    expect(payoutMock).toHaveBeenCalledWith("acct_test_payout", 40000, "USD");

    const payoutRow = await prisma.payment.findFirst({
      where: { relatedPaymentId: PAYMENT_ID, type: "PAYOUT" },
    });
    expect(payoutRow).not.toBeNull();
    expect(payoutRow?.amount).toBe(40000);
    expect(payoutRow?.status).toBe("SUCCEEDED");
  });

  it("rejects a second payout attempt for the same charge (idempotency)", async () => {
    const result = await payoutForPayment(PAYMENT_ID);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("CONFLICT");
    }
    expect(payoutMock).toHaveBeenCalledTimes(1); // not called again
  });

  it("rejects payout for a host who hasn't completed Stripe Connect onboarding", async () => {
    const result = await payoutForPayment(PAYMENT_NO_STRIPE_ID);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain("Stripe Connect onboarding");
    }
  });

  it("rejects a non-existent payment id", async () => {
    const result = await payoutForPayment("00000000-0000-0000-0000-000000000000");
    expect(result.success).toBe(false);
  });
});
