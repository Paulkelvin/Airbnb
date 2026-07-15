import { z } from "zod";

const baseListing = {
  title: z.string().min(5, "Title must be at least 5 characters").max(100),
  description: z.string().min(20, "Description must be at least 20 characters").max(5000),
  propertyTypeId: z.string().uuid(),
  bedrooms: z.coerce.number().int().min(0).max(50),
  bathrooms: z.coerce.number().min(0).max(50),
  maxOccupants: z.coerce.number().int().min(1).max(100),
  sizeSqft: z.coerce.number().int().positive().optional(),
  currency: z.string().length(3).default("USD"),
  amenityIds: z.array(z.string().uuid()).optional(),
  address: z.object({
    line1: z.string().min(1),
    line2: z.string().optional(),
    city: z.string().min(1),
    region: z.string().min(1),
    postalCode: z.string().min(1),
    country: z.string().length(2),
    latitude: z.coerce.number().min(-90).max(90).optional(),
    longitude: z.coerce.number().min(-180).max(180).optional(),
  }),
};

export const shortTermListingSchema = z.object({
  ...baseListing,
  rentalType: z.literal("SHORT_TERM"),
  nightlyPrice: z.coerce.number().positive(),
  cleaningFee: z.coerce.number().min(0).optional(),
  minNights: z.coerce.number().int().min(1).default(1),
  maxNights: z.coerce.number().int().min(1).optional(),
  weeklyDiscountPercent: z.coerce.number().min(0).max(100).optional(),
  monthlyDiscountPercent: z.coerce.number().min(0).max(100).optional(),
  checkInTime: z.string().regex(/^\d{2}:\d{2}$/),
  checkOutTime: z.string().regex(/^\d{2}:\d{2}$/),
  instantBook: z.boolean().default(false),
  cancellationPolicy: z.enum(["FLEXIBLE", "MODERATE", "STRICT"]),
});

export const longTermListingSchema = z.object({
  ...baseListing,
  rentalType: z.literal("LONG_TERM"),
  monthlyRent: z.coerce.number().positive(),
  securityDeposit: z.coerce.number().min(0).optional(),
  minLeaseTermMonths: z.coerce.number().int().min(1),
  maxLeaseTermMonths: z.coerce.number().int().min(1).optional(),
  availableFromDate: z.coerce.date().optional(),
  utilitiesIncluded: z.boolean().default(false),
  petPolicy: z.enum(["NOT_ALLOWED", "ALLOWED", "CASE_BY_CASE"]),
  earlyTerminationPolicy: z.enum(["STANDARD", "STRICT"]),
});

export const createListingSchema = z.discriminatedUnion("rentalType", [
  shortTermListingSchema,
  longTermListingSchema,
]);

export type CreateListingInput = z.infer<typeof createListingSchema>;
