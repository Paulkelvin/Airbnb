import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { runBookingLifecycleJob } from "../booking-lifecycle";

/**
 * Integration test for the RENT_DUE_REMINDER addition to the booking
 * lifecycle job (Notifications phase) — real database, mocked payment
 * provider (irrelevant to reminders) and email provider.
 */

vi.mock("@/lib/notifications", () => ({
  getEmailProvider: () => ({ send: vi.fn().mockResolvedValue({ success: true }) }),
}));
vi.mock("@/lib/payments", () => ({
  getPaymentProvider: () => ({ createCharge: vi.fn().mockResolvedValue({ providerTransactionRef: "stub", status: "SUCCEEDED" }) }),
}));

const HOST_ID = "dd000000-0000-4000-a000-000000000001";
const GUEST_ID = "dd000000-0000-4000-a000-000000000002";
const PROPERTY_TYPE_ID = "dd000000-0000-4000-a000-000000000010";

let listingId: string;
let bookingId: string;

beforeAll(async () => {
  await prisma.user.upsert({
    where: { id: HOST_ID },
    create: { id: HOST_ID, email: "rent-reminder-host@example.com", firstName: "Host", lastName: "Test", roles: ["CUSTOMER", "HOST"] },
    update: {},
  });
  await prisma.user.upsert({
    where: { id: GUEST_ID },
    create: { id: GUEST_ID, email: "rent-reminder-guest@example.com", firstName: "Guest", lastName: "Test", roles: ["CUSTOMER"] },
    update: {},
  });
  await prisma.propertyType.upsert({
    where: { id: PROPERTY_TYPE_ID },
    create: { id: PROPERTY_TYPE_ID, name: "RentReminderTestType", slug: "rent-reminder-test-type" },
    update: {},
  });
  const listing = await prisma.listing.create({
    data: {
      hostId: HOST_ID,
      propertyTypeId: PROPERTY_TYPE_ID,
      title: "Rent Reminder Test Listing",
      slug: `rent-reminder-listing-${Date.now()}`,
      description: "test",
      rentalType: "LONG_TERM",
      bedrooms: 1,
      bathrooms: 1,
      maxOccupants: 2,
      currency: "USD",
      status: "PUBLISHED",
      monthlyRent: 2000,
      minLeaseTermMonths: 6,
      petPolicy: "NOT_ALLOWED",
      earlyTerminationPolicy: "STANDARD",
    },
  });
  listingId = listing.id;

  // Due day 18: reminder fires 3 days before, on the 15th.
  const booking = await prisma.booking.create({
    data: {
      listingId,
      guestId: GUEST_ID,
      hostId: HOST_ID,
      rentalType: "LONG_TERM",
      status: "ACTIVE",
      currency: "USD",
      idempotencyKey: `rent-reminder-test-${Date.now()}`,
      leaseStartDate: new Date("2026-01-18"),
      leaseEndDate: new Date("2027-01-18"),
      leaseTermMonths: 12,
      monthlyRentSnapshot: 2000,
      rentDueDayOfMonth: 18,
    },
  });
  bookingId = booking.id;
});

afterAll(async () => {
  await prisma.notification.deleteMany({ where: { userId: { in: [HOST_ID, GUEST_ID] } } });
  await prisma.review.deleteMany({ where: { bookingId } });
  await prisma.payment.deleteMany({ where: { bookingId } });
  await prisma.booking.deleteMany({ where: { id: bookingId } });
  await prisma.listing.deleteMany({ where: { id: listingId } });
  await prisma.propertyType.deleteMany({ where: { id: PROPERTY_TYPE_ID } });
  await prisma.user.deleteMany({ where: { id: { in: [HOST_ID, GUEST_ID] } } });
});

describe("runBookingLifecycleJob — RENT_DUE_REMINDER", () => {
  it("notifies the guest 3 days before the lease's rent due date", async () => {
    const summary = await runBookingLifecycleJob(new Date("2026-08-15T00:00:00Z"));
    expect(summary.rentReminders).toBeGreaterThanOrEqual(1);

    const notification = await prisma.notification.findFirst({
      where: { userId: GUEST_ID, type: "RENT_DUE_REMINDER", channel: "IN_APP" },
    });
    expect(notification).toBeTruthy();
    expect((notification!.payload as Record<string, unknown>).bookingId).toBe(bookingId);
    expect((notification!.payload as Record<string, unknown>).dueDate).toBe("2026-08-18");
  });

  it("does not remind on a day that isn't 3 days before the due date", async () => {
    await prisma.notification.deleteMany({ where: { userId: GUEST_ID, type: "RENT_DUE_REMINDER" } });

    const summary = await runBookingLifecycleJob(new Date("2026-09-01T00:00:00Z"));
    expect(summary.rentReminders).toBe(0);

    const notification = await prisma.notification.findFirst({
      where: { userId: GUEST_ID, type: "RENT_DUE_REMINDER", channel: "IN_APP" },
    });
    expect(notification).toBeNull();
  });
});
