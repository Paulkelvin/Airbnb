import { prisma } from "@/lib/db";
import { getListingsByIds } from "@/modules/listings/queries";

export async function getMyFavoriteListings(userId: string) {
  const favorites = await prisma.favorite.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: { listingId: true },
  });
  // getListingsByIds preserves the given order, which here is most-recently-favorited-first.
  return getListingsByIds(favorites.map((f) => f.listingId));
}

export async function isFavorited(userId: string, listingId: string): Promise<boolean> {
  const row = await prisma.favorite.findUnique({
    where: { userId_listingId: { userId, listingId } },
    select: { userId: true },
  });
  return Boolean(row);
}

/** For bulk-checking heart-icon state across a whole search results grid without N queries. */
export async function getFavoritedListingIds(userId: string, listingIds: string[]): Promise<Set<string>> {
  if (listingIds.length === 0) return new Set();
  const rows = await prisma.favorite.findMany({
    where: { userId, listingId: { in: listingIds } },
    select: { listingId: true },
  });
  return new Set(rows.map((r) => r.listingId));
}
