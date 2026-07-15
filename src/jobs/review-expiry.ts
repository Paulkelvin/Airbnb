import { prisma } from "@/lib/db";
import { recomputeListingRating } from "@/modules/reviews/rating";

/**
 * Auto-publishes reviews whose double-blind window has closed (Platform
 * Architecture Blueprint §8: "until both have submitted, or a 14-day window
 * expires" — ADR-015 explicitly names "review double-blind window expiry"
 * as a required scheduled job).
 *
 * The window is measured from each review's own submission — a review still
 * hidden 14+ days after *it* was created has, by definition, no counterpart
 * yet (createReview() publishes both sides immediately the moment a
 * counterpart arrives, so a still-hidden review after 14 days can only mean
 * the other side never submitted). Safe to re-run: only touches rows still
 * `isVisible = false` past the window.
 */
const WINDOW_DAYS = 14;

export interface ReviewExpiryJobSummary {
  published: number;
  listingsRecomputed: number;
}

export async function runReviewExpiryJob(referenceDate: Date = new Date()): Promise<ReviewExpiryJobSummary> {
  const cutoff = new Date(referenceDate.getTime() - WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const expired = await prisma.review.findMany({
    where: { isVisible: false, createdAt: { lte: cutoff } },
    select: { id: true, listingId: true, direction: true },
  });

  if (expired.length === 0) {
    return { published: 0, listingsRecomputed: 0 };
  }

  await prisma.review.updateMany({
    where: { id: { in: expired.map((r) => r.id) } },
    data: { isVisible: true, publishedAt: referenceDate },
  });

  const listingIds = Array.from(
    new Set(expired.filter((r) => r.direction === "GUEST_TO_HOST").map((r) => r.listingId)),
  );

  for (const listingId of listingIds) {
    await recomputeListingRating(prisma, listingId);
  }

  return { published: expired.length, listingsRecomputed: listingIds.length };
}
