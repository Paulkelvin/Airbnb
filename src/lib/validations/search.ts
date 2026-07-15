import { z } from "zod";

export const sortOptionSchema = z.enum([
  "relevance",
  "price_asc",
  "price_desc",
  "newest",
  "rating",
  "distance",
]);

export type SortOption = z.infer<typeof sortOptionSchema>;

/**
 * Search params are parsed from URL query strings (ADR-013: URL as source
 * of truth). `rentalType` is the required top-level facet that gates which
 * secondary filters apply — when absent from the URL we default to
 * SHORT_TERM rather than error, since a bare `/listing-stay` visit is a
 * normal entry point, not a malformed request.
 */
export const searchParamsSchema = z.object({
  rentalType: z.enum(["SHORT_TERM", "LONG_TERM"]).default("SHORT_TERM"),
  q: z.string().trim().min(1).max(200).optional(),
  propertyType: z.string().trim().min(1).optional(), // slug
  city: z.string().trim().min(1).max(100).optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  bedrooms: z.coerce.number().int().min(0).optional(),
  bathrooms: z.coerce.number().min(0).optional(),
  guests: z.coerce.number().int().min(1).optional(),
  // Comma-separated amenity slugs in the URL, normalized to an array here.
  amenities: z
    .union([z.string(), z.array(z.string())])
    .transform((v) => (Array.isArray(v) ? v : v.split(",")))
    .pipe(z.array(z.string().trim().min(1)))
    .optional(),
  // Short-term availability window.
  checkIn: z.coerce.date().optional(),
  checkOut: z.coerce.date().optional(),
  // Long-term desired move-in date.
  moveIn: z.coerce.date().optional(),
  // Geo radius ("near me" / map-bounds search).
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  radiusKm: z.coerce.number().positive().max(500).optional(),
  sort: sortOptionSchema.optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});

export type SearchParams = z.infer<typeof searchParamsSchema>;

/**
 * Parses a Next.js searchParams object into validated SearchParams. A search
 * page must never 500 on a malformed/hand-edited URL — invalid input falls
 * back to defaults rather than throwing.
 */
export function parseSearchParams(
  raw: Record<string, string | string[] | undefined>,
): SearchParams {
  const result = searchParamsSchema.safeParse(raw);
  if (result.success) return result.data;
  const rentalType = raw.rentalType === "LONG_TERM" ? "LONG_TERM" : "SHORT_TERM";
  return searchParamsSchema.parse({ rentalType });
}
