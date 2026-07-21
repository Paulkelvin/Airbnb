import { prisma } from "@/lib/db";
import type { ListingWithRelations } from "./types";

export async function getActivePropertyTypes() {
  return prisma.propertyType.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, slug: true },
  });
}

export async function getActiveAmenities() {
  return prisma.amenity.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, slug: true, category: true, icon: true },
  });
}


export const listingInclude = {
  address: true,
  images: true,
  amenities: { include: { amenity: true } },
  propertyType: true,
  host: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
} as const;

/**
 * Fetches a listing by slug. Non-published listings are only returned to
 * their owner or an admin — everyone else gets null, same as not-found.
 */
export async function getListingBySlug(
  slug: string,
  viewer?: { id: string; roles: string[] },
): Promise<ListingWithRelations | null> {
  const listing = await prisma.listing.findUnique({
    where: { slug },
    include: listingInclude,
  });

  if (!listing) return null;

  const isOwner = viewer?.id === listing.hostId;
  const isAdmin = viewer?.roles.includes("ADMIN") ?? false;

  if (listing.status !== "PUBLISHED" && !isOwner && !isAdmin) {
    return null;
  }

  return listing;
}

/** Owner-only fetch by id, used for the edit form. Returns null if not found or not owned. */
export async function getOwnedListingById(
  id: string,
  ownerId: string,
): Promise<ListingWithRelations | null> {
  const listing = await prisma.listing.findUnique({
    where: { id },
    include: listingInclude,
  });

  if (!listing || listing.hostId !== ownerId) return null;

  return listing;
}

/**
 * Unrestricted fetch by id for the edit form, used instead of
 * `getOwnedListingById` when the caller is already known to be an ADMIN —
 * marketplace mode is off, so admins manage every listing, not just ones
 * they personally own.
 */
export async function getListingByIdForAdmin(id: string): Promise<ListingWithRelations | null> {
  return prisma.listing.findUnique({
    where: { id },
    include: listingInclude,
  });
}

export async function getMyListings(
  hostId: string,
): Promise<ListingWithRelations[]> {
  return prisma.listing.findMany({
    where: { hostId },
    include: listingInclude,
    orderBy: { updatedAt: "desc" },
  });
}

/** Hydrates a set of listing IDs with full relations, preserving the given order (Prisma's `in` filter does not). */
export async function getListingsByIds(ids: string[]): Promise<ListingWithRelations[]> {
  if (ids.length === 0) return [];

  const rows = await prisma.listing.findMany({
    where: { id: { in: ids } },
    include: listingInclude,
  });

  const byId = new Map(rows.map((row) => [row.id, row]));
  return ids.map((id) => byId.get(id)).filter((row): row is ListingWithRelations => Boolean(row));
}

export interface PublishedListingsPage {
  items: ListingWithRelations[];
  nextCursor: string | null;
}

/**
 * Simple cursor-paginated feed of published listings. No filters/search yet
 * — that's Phase 4 (ADR-013's searchListings()); this exists so the public
 * grid renders real data instead of demo listings.
 */
export async function getPublishedListings(
  params: { cursor?: string; limit?: number } = {},
): Promise<PublishedListingsPage> {
  const limit = Math.min(params.limit ?? 12, 50);

  const items = await prisma.listing.findMany({
    where: { status: "PUBLISHED" },
    include: listingInclude,
    orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
    take: limit + 1,
    ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
  });

  const hasMore = items.length > limit;
  const page = hasMore ? items.slice(0, limit) : items;

  return {
    items: page,
    nextCursor: hasMore ? page[page.length - 1].id : null,
  };
}

/**
 * The featured/primary listing for the homepage Hero — Potomac Vista Cottage
 * is currently the only property, so this is just the most recently
 * published one. If marketplace mode is re-enabled and multiple listings
 * exist again, the Hero degrades gracefully (see SectionHero) rather than
 * needing this function to change.
 */
export async function getPrimaryListing(): Promise<{ slug: string; title: string } | null> {
  return prisma.listing.findFirst({
    where: { status: "PUBLISHED" },
    orderBy: { publishedAt: "desc" },
    select: { slug: true, title: true },
  });
}

/** Slug + last-modified for every published listing — feeds `src/app/sitemap.ts`. */
export async function getPublishedListingSlugsForSitemap(): Promise<
  { slug: string; updatedAt: Date }[]
> {
  return prisma.listing.findMany({
    where: { status: "PUBLISHED" },
    select: { slug: true, updatedAt: true },
    orderBy: { publishedAt: "desc" },
  });
}

/**
 * Cities with the most published listings — feeds the homepage's destination
 * tabs. Only counts cities that match the admin-curated City list (active),
 * so a handful of free-typed/misspelled entries can't hijack the curation —
 * the admin decides what's eligible, hosts can still list anywhere.
 */
export async function getTopCities(limit = 6): Promise<string[]> {
  const rows = await prisma.address.groupBy({
    by: ["city"],
    where: { listing: { status: "PUBLISHED" } },
    _count: { city: true },
    orderBy: { _count: { city: "desc" } },
  });
  const activeNames = await activeCityNameSet(rows.map((row) => row.city));
  return rows
    .filter((row) => activeNames.has(row.city.toLowerCase()))
    .slice(0, limit)
    .map((row) => row.city);
}

/**
 * The City table holds ~32,000 US Census places, so rather than pulling every
 * active row into memory, this only checks the handful of distinct city
 * names that actually showed up in the groupBy above.
 */
async function activeCityNameSet(candidateNames: string[]): Promise<Set<string>> {
  if (candidateNames.length === 0) return new Set();
  const activeCities = await prisma.city.findMany({
    where: {
      isActive: true,
      name: { in: Array.from(new Set(candidateNames)), mode: "insensitive" },
    },
    select: { name: true },
  });
  return new Set(activeCities.map((c) => c.name.toLowerCase()));
}

const CITY_THUMBNAILS: Record<string, string> = {
  "New York":
    "https://images.pexels.com/photos/2190283/pexels-photo-2190283.jpeg?auto=compress&cs=tinysrgb&w=600",
  Miami:
    "https://images.pexels.com/photos/3601425/pexels-photo-3601425.jpeg?auto=compress&cs=tinysrgb&w=600",
  "Los Angeles":
    "https://images.pexels.com/photos/2695679/pexels-photo-2695679.jpeg?auto=compress&cs=tinysrgb&w=600",
  Chicago:
    "https://images.pexels.com/photos/1769370/pexels-photo-1769370.jpeg?auto=compress&cs=tinysrgb&w=600",
  "San Diego":
    "https://images.pexels.com/photos/2476632/pexels-photo-2476632.jpeg?auto=compress&cs=tinysrgb&w=600",
  Austin:
    "https://images.pexels.com/photos/1563256/pexels-photo-1563256.jpeg?auto=compress&cs=tinysrgb&w=600",
  Denver:
    "https://images.pexels.com/photos/2706750/pexels-photo-2706750.jpeg?auto=compress&cs=tinysrgb&w=600",
  Charleston:
    "https://images.pexels.com/photos/3935350/pexels-photo-3935350.jpeg?auto=compress&cs=tinysrgb&w=600",
};

import type { TaxonomyType } from "@/data/types";

export async function getTopCityCategories(limit = 8): Promise<TaxonomyType[]> {
  const rows = await prisma.address.groupBy({
    by: ["city"],
    where: { listing: { status: "PUBLISHED" } },
    _count: { city: true },
    orderBy: { _count: { city: "desc" } },
  });
  const activeNames = await activeCityNameSet(rows.map((row) => row.city));
  const curated = rows.filter((row) => activeNames.has(row.city.toLowerCase())).slice(0, limit);

  return curated.map((row, i) => ({
    id: String(i + 1),
    href: `/listing-stay?city=${encodeURIComponent(row.city)}` as any,
    name: row.city,
    taxonomy: "category" as const,
    count: row._count.city,
    thumbnail: CITY_THUMBNAILS[row.city] ?? CITY_THUMBNAILS["New York"],
  }));
}
