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

/** Cities with the most published listings — feeds the homepage's destination tabs. */
export async function getTopCities(limit = 6): Promise<string[]> {
  const rows = await prisma.address.groupBy({
    by: ["city"],
    where: { listing: { status: "PUBLISHED" } },
    _count: { city: true },
    orderBy: { _count: { city: "desc" } },
    take: limit,
  });
  return rows.map((row) => row.city);
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
    take: limit,
  });

  return rows.map((row, i) => ({
    id: String(i + 1),
    href: `/listing-stay?city=${encodeURIComponent(row.city)}` as any,
    name: row.city,
    taxonomy: "category" as const,
    count: row._count.city,
    thumbnail: CITY_THUMBNAILS[row.city] ?? CITY_THUMBNAILS["New York"],
  }));
}
