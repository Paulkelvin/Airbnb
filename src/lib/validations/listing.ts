import { z } from "zod";

export const listingImageSchema = z.object({
  url: z.string().url(),
  publicId: z.string().min(1),
  position: z.coerce.number().int().min(0),
  isCover: z.boolean().default(false),
  width: z.coerce.number().int().positive().nullish(),
  height: z.coerce.number().int().positive().nullish(),
  altText: z.string().max(200).nullish(),
});

const addressSchema = z.object({
  line1: z.string().min(1),
  line2: z.string().nullish(),
  city: z.string().min(1),
  region: z.string().min(1),
  postalCode: z.string().min(1),
  country: z.string().length(2),
  latitude: z.coerce.number().min(-90).max(90).nullish(),
  longitude: z.coerce.number().min(-180).max(180).nullish(),
});

const partialAddressSchema = addressSchema.partial();

const baseListing = {
  title: z.string().min(5, "Title must be at least 5 characters").max(100),
  description: z.string().min(20, "Description must be at least 20 characters").max(5000),
  propertyTypeId: z.string().uuid(),
  bedrooms: z.coerce.number().int().min(0).max(50),
  bathrooms: z.coerce.number().min(0).max(50),
  maxOccupants: z.coerce.number().int().min(1).max(100),
  sizeSqft: z.coerce.number().int().positive().nullish(),
  currency: z.string().length(3).default("USD"),
  amenityIds: z.array(z.string().uuid()).default([]),
  images: z.array(listingImageSchema).max(20).default([]),
  address: addressSchema,
  // Not long-term-specific — a short-term rental can just as easily allow
  // (or charge for) pets, so this lives on both rental-type branches.
  petPolicy: z.enum(["NOT_ALLOWED", "ALLOWED", "CASE_BY_CASE"]).default("NOT_ALLOWED"),
};

const shortTermFields = {
  nightlyPrice: z.coerce.number().positive(),
  cleaningFee: z.coerce.number().min(0).nullish(),
  minNights: z.coerce.number().int().min(1).default(1),
  maxNights: z.coerce.number().int().min(1).nullish(),
  weeklyDiscountPercent: z.coerce.number().min(0).max(100).nullish(),
  monthlyDiscountPercent: z.coerce.number().min(0).max(100).nullish(),
  // Nullable: a host can opt out of a fixed check-in/check-out window
  // (self check-in, flexible arrival) instead of being forced to pick a time.
  checkInTime: z.string().regex(/^\d{2}:\d{2}$/).nullish(),
  checkOutTime: z.string().regex(/^\d{2}:\d{2}$/).nullish(),
  instantBook: z.boolean().default(false),
  cancellationPolicy: z.enum(["FLEXIBLE", "MODERATE", "STRICT"]),
};

const longTermFields = {
  monthlyRent: z.coerce.number().positive(),
  securityDeposit: z.coerce.number().min(0).nullish(),
  minLeaseTermMonths: z.coerce.number().int().min(1),
  maxLeaseTermMonths: z.coerce.number().int().min(1).nullish(),
  availableFromDate: z.coerce.date().nullish(),
  utilitiesIncluded: z.boolean().default(false),
  earlyTerminationPolicy: z.enum(["STANDARD", "STRICT"]),
};

export const shortTermListingSchema = z.object({
  ...baseListing,
  rentalType: z.literal("SHORT_TERM"),
  ...shortTermFields,
});

export const longTermListingSchema = z.object({
  ...baseListing,
  rentalType: z.literal("LONG_TERM"),
  ...longTermFields,
});

/** Full, strict schema — every field required for the listing's rentalType. Enforced at publish time. */
export const createListingSchema = z.discriminatedUnion("rentalType", [
  shortTermListingSchema,
  longTermListingSchema,
]);

export const updateListingSchema = z.discriminatedUnion("rentalType", [
  shortTermListingSchema.extend({ id: z.string().uuid() }),
  longTermListingSchema.extend({ id: z.string().uuid() }),
]);

/** Minimal fields to create a DRAFT row — everything else is filled in via draftUpdateSchema across later steps. */
export const createDraftListingSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters").max(100),
  propertyTypeId: z.string().uuid(),
  rentalType: z.enum(["SHORT_TERM", "LONG_TERM"]),
});

/**
 * Lenient, flat, all-optional schema for incremental draft saves — a DRAFT
 * listing is explicitly allowed to be incomplete (see the `status = 'DRAFT'`
 * exemption on the DB CHECK constraints). Branch consistency (short-term vs
 * long-term fields) and completeness are only enforced by createListingSchema
 * at publish time.
 */
export const draftUpdateSchema = z.object({
  id: z.string().uuid(),
  title: baseListing.title.optional(),
  description: baseListing.description.optional(),
  propertyTypeId: baseListing.propertyTypeId.optional(),
  bedrooms: baseListing.bedrooms.optional(),
  bathrooms: baseListing.bathrooms.optional(),
  maxOccupants: baseListing.maxOccupants.optional(),
  sizeSqft: baseListing.sizeSqft,
  currency: baseListing.currency.optional(),
  // Built without baseListing.amenityIds/images — those carry .default([]),
  // which Zod applies whenever the key is *absent*, turning "this step
  // didn't touch amenities/images" into "replace them with an empty array."
  // A draft save must be able to omit these entirely and leave them alone.
  amenityIds: z.array(z.string().uuid()).optional(),
  images: z.array(listingImageSchema).max(20).optional(),
  address: partialAddressSchema.optional(),
  petPolicy: baseListing.petPolicy.optional(),
  rentalType: z.enum(["SHORT_TERM", "LONG_TERM"]).optional(),
  // Short-term fields
  nightlyPrice: shortTermFields.nightlyPrice.optional(),
  cleaningFee: shortTermFields.cleaningFee,
  minNights: shortTermFields.minNights.optional(),
  maxNights: shortTermFields.maxNights,
  weeklyDiscountPercent: shortTermFields.weeklyDiscountPercent,
  monthlyDiscountPercent: shortTermFields.monthlyDiscountPercent,
  checkInTime: shortTermFields.checkInTime.optional(),
  checkOutTime: shortTermFields.checkOutTime.optional(),
  instantBook: shortTermFields.instantBook.optional(),
  cancellationPolicy: shortTermFields.cancellationPolicy.optional(),
  // Long-term fields
  monthlyRent: longTermFields.monthlyRent.optional(),
  securityDeposit: longTermFields.securityDeposit,
  minLeaseTermMonths: longTermFields.minLeaseTermMonths.optional(),
  maxLeaseTermMonths: longTermFields.maxLeaseTermMonths,
  availableFromDate: longTermFields.availableFromDate,
  utilitiesIncluded: longTermFields.utilitiesIncluded.optional(),
  earlyTerminationPolicy: longTermFields.earlyTerminationPolicy.optional(),
});

export type CreateListingInput = z.infer<typeof createListingSchema>;
export type UpdateListingInput = z.infer<typeof updateListingSchema>;
export type CreateDraftListingInput = z.infer<typeof createDraftListingSchema>;
export type DraftUpdateInput = z.infer<typeof draftUpdateSchema>;
export type ListingImageInput = z.infer<typeof listingImageSchema>;
