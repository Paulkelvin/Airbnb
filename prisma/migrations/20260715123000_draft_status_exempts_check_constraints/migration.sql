-- DRAFT listings are explicitly allowed to be incomplete — the Phase 3
-- add-listing wizard saves progress incrementally, which means a DRAFT row
-- can exist with only step-1 fields populated. The original CHECK
-- constraints (Phase 2) enforced rentalType-conditional required fields
-- unconditionally, which made incremental draft-saving impossible. Exempt
-- DRAFT status; completeness is still enforced at publish time by the
-- strict Zod schema in publishListing(), and these constraints remain the
-- safety net for every non-draft status.

ALTER TABLE "Listing" DROP CONSTRAINT "chk_listing_short_term_fields";
ALTER TABLE "Listing" ADD CONSTRAINT "chk_listing_short_term_fields"
  CHECK (
    "status" = 'DRAFT' OR "rentalType" != 'SHORT_TERM' OR (
      "nightlyPrice" IS NOT NULL AND
      "minNights" IS NOT NULL AND
      "checkInTime" IS NOT NULL AND
      "checkOutTime" IS NOT NULL AND
      "cancellationPolicy" IS NOT NULL
    )
  );

ALTER TABLE "Listing" DROP CONSTRAINT "chk_listing_long_term_fields";
ALTER TABLE "Listing" ADD CONSTRAINT "chk_listing_long_term_fields"
  CHECK (
    "status" = 'DRAFT' OR "rentalType" != 'LONG_TERM' OR (
      "monthlyRent" IS NOT NULL AND
      "minLeaseTermMonths" IS NOT NULL AND
      "petPolicy" IS NOT NULL AND
      "earlyTerminationPolicy" IS NOT NULL
    )
  );
