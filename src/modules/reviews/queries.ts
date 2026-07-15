import { prisma } from "@/lib/db";

const authorSelect = { id: true, firstName: true, lastName: true, avatarUrl: true } as const;

/** Only published, guest-authored reviews — this is what renders publicly on a listing page. */
export async function getReviewsForListing(listingId: string) {
  return prisma.review.findMany({
    where: { listingId, direction: "GUEST_TO_HOST", isVisible: true },
    include: { author: { select: authorSelect } },
    orderBy: { publishedAt: "desc" },
  });
}

/** Reviews the user has written, either direction. */
export async function getMyAuthoredReviews(userId: string) {
  return prisma.review.findMany({
    where: { authorId: userId },
    include: {
      author: { select: authorSelect },
      listing: { select: { id: true, slug: true, title: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Completed/terminated bookings the user hasn't reviewed yet — drives "you
 * have N reviews to write" prompts. A booking has exactly one guest and one
 * host, so "no review authored by this user for this booking" is equivalent
 * to "this user hasn't submitted their side yet," regardless of direction.
 */
export async function getPendingReviewPrompts(userId: string) {
  return prisma.booking.findMany({
    where: {
      OR: [{ guestId: userId }, { hostId: userId }],
      status: { in: ["COMPLETED", "TERMINATED_EARLY"] },
      reviews: { none: { authorId: userId } },
    },
    select: {
      id: true,
      rentalType: true,
      guestId: true,
      hostId: true,
      checkInDate: true,
      checkOutDate: true,
      leaseStartDate: true,
      leaseEndDate: true,
      listing: { select: { id: true, slug: true, title: true } },
      guest: { select: { firstName: true, lastName: true } },
      host: { select: { firstName: true, lastName: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getReviewById(reviewId: string) {
  return prisma.review.findUnique({
    where: { id: reviewId },
    include: { listing: { select: { id: true, hostId: true, slug: true } } },
  });
}

export async function getReviewByBookingAndDirection(
  bookingId: string,
  direction: "GUEST_TO_HOST" | "HOST_TO_GUEST",
) {
  return prisma.review.findUnique({ where: { bookingId_direction: { bookingId, direction } } });
}
