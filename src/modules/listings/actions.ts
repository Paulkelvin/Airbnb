"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAuth, requireOwnership, AuthError } from "@/lib/auth";
import { deleteCloudinaryImage } from "@/lib/cloudinary";
import {
  createListingSchema,
  createDraftListingSchema,
  draftUpdateSchema,
  type CreateListingInput,
  type CreateDraftListingInput,
  type DraftUpdateInput,
} from "@/lib/validations/listing";
import type { ActionResult } from "@/lib/validations/auth";
import { isListingModerationEnabled } from "@/modules/admin/settings";

function slugify(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function generateUniqueSlug(title: string): Promise<string> {
  const base = slugify(title) || "listing";
  let slug = base;
  let suffix = 0;

  while (await prisma.listing.findUnique({ where: { slug }, select: { id: true } })) {
    suffix += 1;
    slug = `${base}-${suffix}`;
  }

  return slug;
}

async function ensureHostRole(userId: string, currentRoles: string[]) {
  if (!currentRoles.includes("HOST")) {
    // Self-serve hosting: a CUSTOMER becomes a HOST by creating their first
    // listing — there's no separate host-application flow in this phase.
    await prisma.user.update({ where: { id: userId }, data: { roles: { push: "HOST" } } });
  }
}

/** Step 1: creates a minimal DRAFT row. The CHECK constraints exempt DRAFT status, so every other field can be filled in incrementally via saveListingDraft. */
export async function createDraftListing(
  input: CreateDraftListingInput,
): Promise<ActionResult<{ id: string; slug: string }>> {
  const user = await requireAuth();

  const parsed = createDraftListingSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid listing data",
        fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      },
    };
  }

  const data = parsed.data;
  const slug = await generateUniqueSlug(data.title);

  await ensureHostRole(user.id, user.roles);

  const listing = await prisma.listing.create({
    data: {
      hostId: user.id,
      propertyTypeId: data.propertyTypeId,
      title: data.title,
      slug,
      description: "",
      rentalType: data.rentalType,
      bedrooms: 1,
      bathrooms: 1,
      maxOccupants: 1,
      currency: "USD",
      status: "DRAFT",
    },
    select: { id: true, slug: true },
  });

  revalidatePath("/account-listings");

  return { success: true, data: listing };
}

/** Steps 2+: partial, incremental save. Works for both in-progress drafts and edits to already-published listings. */
export async function saveListingDraft(
  input: DraftUpdateInput,
): Promise<ActionResult<{ id: string }>> {
  const user = await requireAuth();

  const parsed = draftUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid listing data",
        fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      },
    };
  }

  const { id, address, amenityIds, images, ...scalarFields } = parsed.data;

  const existing = await prisma.listing.findUnique({
    where: { id },
    include: { images: true },
  });

  if (!existing) {
    return { success: false, error: { code: "NOT_FOUND", message: "Listing not found" } };
  }

  try {
    await requireOwnership(existing.hostId);
  } catch (err) {
    if (err instanceof AuthError) {
      return { success: false, error: { code: err.code, message: err.message } };
    }
    throw err;
  }

  const removedImages =
    images !== undefined
      ? existing.images.filter(
          (existingImg) => !images.some((newImg) => newImg.publicId === existingImg.publicId),
        )
      : [];

  try {
    await prisma.$transaction(async (tx) => {
      await tx.listing.update({
        where: { id },
        data: {
          ...scalarFields,
          sizeSqft: scalarFields.sizeSqft ?? undefined,
          address: address
            ? {
                upsert: {
                  create: {
                    line1: address.line1 ?? "",
                    line2: address.line2 ?? null,
                    city: address.city ?? "",
                    region: address.region ?? "",
                    postalCode: address.postalCode ?? "",
                    country: address.country ?? "US",
                    latitude: address.latitude ?? null,
                    longitude: address.longitude ?? null,
                  },
                  update: {
                    ...address,
                    line2: address.line2 ?? null,
                    latitude: address.latitude ?? null,
                    longitude: address.longitude ?? null,
                  },
                },
              }
            : undefined,
        },
      });

      if (amenityIds !== undefined) {
        await tx.listingAmenity.deleteMany({ where: { listingId: id } });
        if (amenityIds.length > 0) {
          await tx.listingAmenity.createMany({
            data: amenityIds.map((amenityId) => ({ listingId: id, amenityId })),
          });
        }
      }

      if (images !== undefined) {
        await tx.image.deleteMany({ where: { listingId: id } });
        if (images.length > 0) {
          await tx.image.createMany({
            data: images.map((img, i) => ({
              listingId: id,
              url: img.url,
              publicId: img.publicId,
              altText: img.altText ?? null,
              position: img.position ?? i,
              isCover: img.isCover ?? i === 0,
              width: img.width ?? null,
              height: img.height ?? null,
            })),
          });
        }
      }
    });
  } catch (err) {
    // A CHECK constraint violation means this write would have made a
    // non-DRAFT listing incomplete — surface it as a validation error.
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message:
          existing.status === "DRAFT"
            ? "Could not save changes"
            : "This change would leave the published listing incomplete",
      },
    };
  }

  await Promise.allSettled(
    removedImages
      .filter((img) => img.publicId)
      .map((img) => deleteCloudinaryImage(img.publicId as string)),
  );

  revalidatePath("/account-listings");
  revalidatePath(`/listing-stay-detail/${existing.slug}`);

  return { success: true, data: { id } };
}

/** Maps a DB row back into the strict Zod shape to check publish-readiness. */
function toStrictInput(listing: {
  title: string;
  description: string;
  propertyTypeId: string;
  bedrooms: number;
  bathrooms: unknown;
  maxOccupants: number;
  sizeSqft: number | null;
  currency: string;
  rentalType: string;
  nightlyPrice: unknown;
  cleaningFee: unknown;
  minNights: number | null;
  maxNights: number | null;
  weeklyDiscountPercent: unknown;
  monthlyDiscountPercent: unknown;
  checkInTime: string | null;
  checkOutTime: string | null;
  instantBook: boolean | null;
  cancellationPolicy: string | null;
  monthlyRent: unknown;
  securityDeposit: unknown;
  minLeaseTermMonths: number | null;
  maxLeaseTermMonths: number | null;
  availableFromDate: Date | null;
  utilitiesIncluded: boolean | null;
  petPolicy: string | null;
  earlyTerminationPolicy: string | null;
  address: {
    line1: string;
    line2: string | null;
    city: string;
    region: string;
    postalCode: string;
    country: string;
    latitude: number | null;
    longitude: number | null;
  } | null;
  amenities: { amenityId: string }[];
  images: { url: string; publicId: string | null; position: number; isCover: boolean }[];
}): CreateListingInput | null {
  if (!listing.address) return null;

  const base = {
    title: listing.title,
    description: listing.description,
    propertyTypeId: listing.propertyTypeId,
    bedrooms: listing.bedrooms,
    bathrooms: Number(listing.bathrooms),
    maxOccupants: listing.maxOccupants,
    sizeSqft: listing.sizeSqft ?? undefined,
    currency: listing.currency,
    amenityIds: listing.amenities.map((a) => a.amenityId),
    images: listing.images.map((img) => ({
      url: img.url,
      publicId: img.publicId ?? "",
      position: img.position,
      isCover: img.isCover,
    })),
    address: {
      line1: listing.address.line1,
      line2: listing.address.line2 ?? undefined,
      city: listing.address.city,
      region: listing.address.region,
      postalCode: listing.address.postalCode,
      country: listing.address.country,
      latitude: listing.address.latitude ?? undefined,
      longitude: listing.address.longitude ?? undefined,
    },
  };

  if (listing.rentalType === "SHORT_TERM") {
    return {
      ...base,
      rentalType: "SHORT_TERM",
      nightlyPrice: Number(listing.nightlyPrice),
      cleaningFee: listing.cleaningFee ? Number(listing.cleaningFee) : undefined,
      minNights: listing.minNights ?? 1,
      maxNights: listing.maxNights ?? undefined,
      weeklyDiscountPercent: listing.weeklyDiscountPercent
        ? Number(listing.weeklyDiscountPercent)
        : undefined,
      monthlyDiscountPercent: listing.monthlyDiscountPercent
        ? Number(listing.monthlyDiscountPercent)
        : undefined,
      checkInTime: listing.checkInTime ?? "",
      checkOutTime: listing.checkOutTime ?? "",
      instantBook: listing.instantBook ?? false,
      cancellationPolicy: (listing.cancellationPolicy ?? "") as
        | "FLEXIBLE"
        | "MODERATE"
        | "STRICT",
    };
  }

  return {
    ...base,
    rentalType: "LONG_TERM",
    monthlyRent: Number(listing.monthlyRent),
    securityDeposit: listing.securityDeposit ? Number(listing.securityDeposit) : undefined,
    minLeaseTermMonths: listing.minLeaseTermMonths ?? 1,
    maxLeaseTermMonths: listing.maxLeaseTermMonths ?? undefined,
    availableFromDate: listing.availableFromDate ?? undefined,
    utilitiesIncluded: listing.utilitiesIncluded ?? false,
    petPolicy: (listing.petPolicy ?? "") as "NOT_ALLOWED" | "ALLOWED" | "CASE_BY_CASE",
    earlyTerminationPolicy: (listing.earlyTerminationPolicy ?? "") as "STANDARD" | "STRICT",
  };
}

async function validateListingCompleteness(listing: {
  images: unknown[];
} & Record<string, unknown>): Promise<ActionResult<null> | null> {
  const strictInput = toStrictInput(listing as Parameters<typeof toStrictInput>[0]);
  const validation = strictInput ? createListingSchema.safeParse(strictInput) : null;

  if (!strictInput || !validation?.success) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "This listing is missing required information before it can be published",
        fieldErrors:
          validation && !validation.success
            ? (validation.error.flatten().fieldErrors as Record<string, string[]>)
            : undefined,
      },
    };
  }

  if (listing.images.length === 0) {
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message: "Add at least one photo before publishing" },
    };
  }

  return null;
}

async function transitionStatus(
  id: string,
  nextStatus: "PUBLISHED" | "PENDING_REVIEW" | "PAUSED" | "ARCHIVED",
): Promise<ActionResult<{ id: string }>> {
  const listing = await prisma.listing.findUnique({
    where: { id },
    include: { images: true, address: true, amenities: true },
  });

  if (!listing) {
    return { success: false, error: { code: "NOT_FOUND", message: "Listing not found" } };
  }

  try {
    await requireOwnership(listing.hostId);
  } catch (err) {
    if (err instanceof AuthError) {
      return { success: false, error: { code: err.code, message: err.message } };
    }
    throw err;
  }

  if (nextStatus === "PUBLISHED" || nextStatus === "PENDING_REVIEW") {
    const validationError = await validateListingCompleteness(listing);
    if (validationError) return validationError as ActionResult<{ id: string }>;
  }

  await prisma.listing.update({
    where: { id },
    data: {
      status: nextStatus,
      publishedAt: nextStatus === "PUBLISHED" && !listing.publishedAt ? new Date() : undefined,
    },
  });

  revalidatePath("/account-listings");
  revalidatePath(`/listing-stay-detail/${listing.slug}`);
  revalidatePath("/listing-stay");

  return { success: true, data: { id } };
}

export async function publishListing(id: string) {
  const moderationOn = await isListingModerationEnabled();
  if (moderationOn) {
    const listing = await prisma.listing.findUnique({ where: { id }, select: { status: true } });
    if (listing && (listing.status === "DRAFT" || listing.status === "REJECTED")) {
      return transitionStatus(id, "PENDING_REVIEW");
    }
  }
  return transitionStatus(id, "PUBLISHED");
}

export async function unpublishListing(id: string) {
  return transitionStatus(id, "PAUSED");
}

/** Soft delete per the domain model's soft-delete strategy — never a hard DELETE. */
export async function archiveListing(id: string) {
  return transitionStatus(id, "ARCHIVED");
}

export async function deleteUploadedImage(publicId: string): Promise<ActionResult<null>> {
  await requireAuth();
  await deleteCloudinaryImage(publicId);
  return { success: true, data: null };
}
