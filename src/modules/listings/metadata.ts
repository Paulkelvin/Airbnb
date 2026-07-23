import { z } from "zod";

/**
 * ADR-020's narrow `Listing.metadata` JSON escape hatch — presentational-only
 * extras that don't warrant a real column or catalog table. Every key must be
 * listed here; anything else is stripped rather than silently trusted.
 */
const listingMetadataSchema = z
  .object({
    // Airbnb shows check-in as a window (e.g. self-check-in available any
    // time from checkInTime through this bound), not a fixed moment like
    // checkOutTime. "HH:MM" 24h, same format as checkInTime/checkOutTime.
    checkInWindowEnd: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    // Flat one-time fee for bringing a pet, shown alongside petPolicy —
    // there's no dedicated column since it only applies when petPolicy is
    // ALLOWED, same rationale as checkInWindowEnd above.
    petFeeAmount: z.number().positive(),
  })
  .partial();

export type ListingMetadata = z.infer<typeof listingMetadataSchema>;

export function parseListingMetadata(value: unknown): ListingMetadata {
  const result = listingMetadataSchema.safeParse(value ?? {});
  return result.success ? result.data : {};
}
