import type { Prisma, PrismaClient } from "@prisma/client";

type Db = PrismaClient | Prisma.TransactionClient;

/**
 * Recomputes Listing.avgRating/reviewCount from currently-visible
 * GUEST_TO_HOST reviews only (Platform Architecture Blueprint §8:
 * "recalculated on review write"). Shared between modules/reviews/actions.ts
 * (publish-on-match, admin hide) and src/jobs/review-expiry.ts
 * (publish-on-window-expiry) — every path that can flip `isVisible` calls
 * this, so it never drifts out of two slightly-different implementations.
 */
export async function recomputeListingRating(db: Db, listingId: string): Promise<void> {
  const agg = await db.review.aggregate({
    where: { listingId, direction: "GUEST_TO_HOST", isVisible: true },
    _avg: { rating: true },
    _count: { rating: true },
  });

  await db.listing.update({
    where: { id: listingId },
    data: {
      avgRating: agg._avg.rating !== null ? Math.round(agg._avg.rating * 100) / 100 : null,
      reviewCount: agg._count.rating,
    },
  });
}
