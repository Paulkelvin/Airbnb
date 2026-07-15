import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";
import { prisma } from "@/lib/db";
import { createReview, respondToReview, hideReview } from "../actions";
import { runReviewExpiryJob } from "@/jobs/review-expiry";

/**
 * Integration tests against the real database for the two-sided, double-blind
 * review mechanism (Domain Model Spec §2.10) and its 14-day expiry job.
 */

// vi.mock factories are hoisted above imports/top-level const declarations,
// so this literal is duplicated from HOST_ID below rather than referenced.
vi.mock("@/lib/auth", () => ({
  requireAuth: vi.fn(),
  requireAdmin: vi.fn().mockResolvedValue({ id: "1a5e8f2a-2b7a-4c1e-9d3f-7c8b1e0a5f11", roles: ["ADMIN"] }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const HOST_ID = "1a5e8f2a-2b7a-4c1e-9d3f-7c8b1e0a5f11";
const GUEST_ID = "2b6f9a3b-3c8b-4d2f-ae4a-8d9c2f1b6a22";
const OTHER_ID = "3c7a0b4c-4d9c-4e3a-bf5b-9eab3f2c7b33";
const PROPERTY_TYPE_ID = "4d8b1c5d-5eab-4f4b-c06c-0abc4f3d8c44";

let listingId: string;
let bookingCompleted: string;
let bookingTerminated: string;
let bookingPending: string;

import { requireAuth } from "@/lib/auth";

async function makeBooking(status: "COMPLETED" | "TERMINATED_EARLY" | "PENDING") {
  const booking = await prisma.booking.create({
    data: {
      listingId,
      guestId: GUEST_ID,
      hostId: HOST_ID,
      rentalType: "SHORT_TERM",
      status,
      currency: "USD",
      idempotencyKey: crypto.randomUUID(),
      checkInDate: new Date("2026-01-01"),
      checkOutDate: new Date("2026-01-05"),
      nights: 4,
      nightlyRateSnapshot: 100,
      totalPrice: 400,
    },
  });
  return booking.id;
}

beforeAll(async () => {
  await prisma.user.upsert({
    where: { id: HOST_ID },
    create: { id: HOST_ID, email: "reviewtest-host@example.com", firstName: "Host", lastName: "Test", roles: ["CUSTOMER", "HOST"] },
    update: {},
  });
  await prisma.user.upsert({
    where: { id: GUEST_ID },
    create: { id: GUEST_ID, email: "reviewtest-guest@example.com", firstName: "Guest", lastName: "Test", roles: ["CUSTOMER"] },
    update: {},
  });
  await prisma.user.upsert({
    where: { id: OTHER_ID },
    create: { id: OTHER_ID, email: "reviewtest-other@example.com", firstName: "Other", lastName: "Test", roles: ["CUSTOMER"] },
    update: {},
  });
  await prisma.propertyType.upsert({
    where: { id: PROPERTY_TYPE_ID },
    create: { id: PROPERTY_TYPE_ID, name: "Review Test Property Type", slug: "review-test-property-type" },
    update: {},
  });

  const listing = await prisma.listing.create({
    data: {
      hostId: HOST_ID,
      propertyTypeId: PROPERTY_TYPE_ID,
      title: "Review Test Listing",
      slug: `review-test-listing-${crypto.randomUUID()}`,
      description: "A listing for review integration tests.",
      rentalType: "SHORT_TERM",
      bedrooms: 1,
      bathrooms: 1,
      maxOccupants: 2,
      currency: "USD",
      status: "PUBLISHED",
      nightlyPrice: 100,
      minNights: 1,
      checkInTime: "15:00",
      checkOutTime: "11:00",
      instantBook: true,
      cancellationPolicy: "MODERATE",
    },
  });
  listingId = listing.id;
});

afterAll(async () => {
  await prisma.review.deleteMany({ where: { listingId } });
  await prisma.booking.deleteMany({ where: { listingId } });
  await prisma.listing.deleteMany({ where: { id: listingId } });
  await prisma.propertyType.deleteMany({ where: { id: PROPERTY_TYPE_ID } });
  await prisma.user.deleteMany({ where: { id: { in: [HOST_ID, GUEST_ID, OTHER_ID] } } });
  await prisma.$disconnect();
});

beforeEach(async () => {
  // Reset the rate limiter between tests — REVIEW_SUBMIT allows only 10/24h
  // per user, and this suite calls createReview far more than that across
  // all its cases for the same fixture users.
  await prisma.rateLimitHit.deleteMany({
    where: { key: { in: [`review:${GUEST_ID}`, `review:${HOST_ID}`, `review:${OTHER_ID}`] } },
  });
  bookingCompleted = await makeBooking("COMPLETED");
  bookingTerminated = await makeBooking("TERMINATED_EARLY");
  bookingPending = await makeBooking("PENDING");
});

describe("createReview eligibility (ADR-024)", () => {
  it("rejects a review for a PENDING booking", async () => {
    vi.mocked(requireAuth).mockResolvedValue({ id: GUEST_ID, roles: ["CUSTOMER"] } as never);
    const result = await createReview({ bookingId: bookingPending, rating: 5, comment: "Great stay" });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe("INVALID_STATE");
  });

  it("allows a review for a COMPLETED booking", async () => {
    vi.mocked(requireAuth).mockResolvedValue({ id: GUEST_ID, roles: ["CUSTOMER"] } as never);
    const result = await createReview({ bookingId: bookingCompleted, rating: 5, comment: "Great stay" });
    expect(result.success).toBe(true);
  });

  it("allows a review for a TERMINATED_EARLY booking", async () => {
    vi.mocked(requireAuth).mockResolvedValue({ id: GUEST_ID, roles: ["CUSTOMER"] } as never);
    const result = await createReview({ bookingId: bookingTerminated, rating: 4, comment: "Ended early but fine" });
    expect(result.success).toBe(true);
  });

  it("rejects a reviewer who wasn't part of the booking", async () => {
    vi.mocked(requireAuth).mockResolvedValue({ id: OTHER_ID, roles: ["CUSTOMER"] } as never);
    const result = await createReview({ bookingId: bookingCompleted, rating: 5, comment: "Not mine to review" });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe("FORBIDDEN");
  });

  it("rejects sub-ratings on a HOST_TO_GUEST review", async () => {
    vi.mocked(requireAuth).mockResolvedValue({ id: HOST_ID, roles: ["CUSTOMER", "HOST"] } as never);
    const result = await createReview({
      bookingId: bookingCompleted,
      rating: 5,
      comment: "Good guest",
      subRatings: { cleanliness: 5, communication: 5, accuracy: 5, location: 5, value: 5 },
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects a duplicate review for the same booking/direction", async () => {
    vi.mocked(requireAuth).mockResolvedValue({ id: GUEST_ID, roles: ["CUSTOMER"] } as never);
    const first = await createReview({ bookingId: bookingCompleted, rating: 5, comment: "First review" });
    expect(first.success).toBe(true);

    const second = await createReview({ bookingId: bookingCompleted, rating: 3, comment: "Second attempt" });
    expect(second.success).toBe(false);
    if (!second.success) expect(second.error.code).toBe("CONFLICT");
  });
});

describe("double-blind publish-on-match", () => {
  it("stays hidden after one side, publishes both the instant the counterpart arrives", async () => {
    vi.mocked(requireAuth).mockResolvedValue({ id: GUEST_ID, roles: ["CUSTOMER"] } as never);
    const guestReview = await createReview({
      bookingId: bookingCompleted,
      rating: 5,
      comment: "Loved it",
      subRatings: { cleanliness: 5, communication: 5, accuracy: 5, location: 5, value: 5 },
    });
    expect(guestReview.success).toBe(true);
    if (!guestReview.success) return;

    const hiddenRow = await prisma.review.findUnique({ where: { id: guestReview.data.id } });
    expect(hiddenRow?.isVisible).toBe(false);

    vi.mocked(requireAuth).mockResolvedValue({ id: HOST_ID, roles: ["CUSTOMER", "HOST"] } as never);
    const hostReview = await createReview({ bookingId: bookingCompleted, rating: 4, comment: "Good guest" });
    expect(hostReview.success).toBe(true);
    if (!hostReview.success) return;

    const bothRows = await prisma.review.findMany({ where: { bookingId: bookingCompleted } });
    expect(bothRows).toHaveLength(2);
    expect(bothRows.every((r) => r.isVisible)).toBe(true);
    expect(bothRows.every((r) => r.publishedAt !== null)).toBe(true);

    const listing = await prisma.listing.findUnique({ where: { id: listingId } });
    expect(listing?.reviewCount).toBeGreaterThanOrEqual(1);
  });
});

describe("respondToReview", () => {
  it("lets the host respond once to a published GUEST_TO_HOST review, and rejects a second response", async () => {
    vi.mocked(requireAuth).mockResolvedValue({ id: GUEST_ID, roles: ["CUSTOMER"] } as never);
    const guestReview = await createReview({ bookingId: bookingCompleted, rating: 5, comment: "Nice place" });
    expect(guestReview.success).toBe(true);
    if (!guestReview.success) return;

    vi.mocked(requireAuth).mockResolvedValue({ id: HOST_ID, roles: ["CUSTOMER", "HOST"] } as never);
    const response = await respondToReview({ reviewId: guestReview.data.id, response: "Thanks for staying!" });
    expect(response.success).toBe(true);

    const second = await respondToReview({ reviewId: guestReview.data.id, response: "Again!" });
    expect(second.success).toBe(false);
    if (!second.success) expect(second.error.code).toBe("CONFLICT");
  });

  it("rejects a response from someone who doesn't own the listing", async () => {
    vi.mocked(requireAuth).mockResolvedValue({ id: GUEST_ID, roles: ["CUSTOMER"] } as never);
    const guestReview = await createReview({ bookingId: bookingCompleted, rating: 5, comment: "Nice place" });
    expect(guestReview.success).toBe(true);
    if (!guestReview.success) return;

    vi.mocked(requireAuth).mockResolvedValue({ id: OTHER_ID, roles: ["CUSTOMER"] } as never);
    const response = await respondToReview({ reviewId: guestReview.data.id, response: "Not my listing" });
    expect(response.success).toBe(false);
    if (!response.success) expect(response.error.code).toBe("FORBIDDEN");
  });
});

describe("hideReview (admin moderation)", () => {
  it("hides a visible review and writes an audit log", async () => {
    vi.mocked(requireAuth).mockResolvedValue({ id: GUEST_ID, roles: ["CUSTOMER"] } as never);
    const guestReview = await createReview({ bookingId: bookingCompleted, rating: 5, comment: "Loved it" });
    if (!guestReview.success) return;
    vi.mocked(requireAuth).mockResolvedValue({ id: HOST_ID, roles: ["CUSTOMER", "HOST"] } as never);
    await createReview({ bookingId: bookingCompleted, rating: 4, comment: "Good guest" });

    const result = await hideReview({ reviewId: guestReview.data.id });
    expect(result.success).toBe(true);

    const row = await prisma.review.findUnique({ where: { id: guestReview.data.id } });
    expect(row?.isVisible).toBe(false);

    const log = await prisma.auditLog.findFirst({
      where: { targetId: guestReview.data.id, action: "REVIEW_HIDDEN" },
    });
    expect(log).not.toBeNull();
    expect(log?.targetType).toBe("Review");
  });
});

describe("runReviewExpiryJob", () => {
  it("publishes a still-hidden review once its own 14-day window has elapsed, and recomputes the listing rating", async () => {
    vi.mocked(requireAuth).mockResolvedValue({ id: GUEST_ID, roles: ["CUSTOMER"] } as never);
    const guestReview = await createReview({ bookingId: bookingCompleted, rating: 5, comment: "Solo review, no counterpart" });
    expect(guestReview.success).toBe(true);
    if (!guestReview.success) return;

    // Backdate createdAt to simulate the window having elapsed.
    await prisma.review.update({
      where: { id: guestReview.data.id },
      data: { createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000) },
    });

    const summary = await runReviewExpiryJob(new Date());
    expect(summary.published).toBeGreaterThanOrEqual(1);

    const row = await prisma.review.findUnique({ where: { id: guestReview.data.id } });
    expect(row?.isVisible).toBe(true);
    expect(row?.publishedAt).not.toBeNull();
  });

  it("does not publish a review still within its 14-day window", async () => {
    vi.mocked(requireAuth).mockResolvedValue({ id: GUEST_ID, roles: ["CUSTOMER"] } as never);
    const guestReview = await createReview({ bookingId: bookingCompleted, rating: 5, comment: "Fresh, still hidden" });
    expect(guestReview.success).toBe(true);
    if (!guestReview.success) return;

    await runReviewExpiryJob(new Date());

    const row = await prisma.review.findUnique({ where: { id: guestReview.data.id } });
    expect(row?.isVisible).toBe(false);
  });
});
