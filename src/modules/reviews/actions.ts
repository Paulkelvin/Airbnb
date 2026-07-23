"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAuth, requireAdmin } from "@/lib/auth";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import {
  createReviewSchema,
  respondToReviewSchema,
  reviewIdSchema,
  type CreateReviewInput,
  type RespondToReviewInput,
  type ReviewIdInput,
} from "@/lib/validations/review";
import type { ActionResult } from "@/lib/validations/auth";
import { recomputeListingRating } from "./rating";
import { notify } from "@/modules/notifications/notify";

/**
 * Submits one side of a two-sided, double-blind review (Domain Model Spec
 * §2.10). Publishes both sides immediately once the counterpart already
 * exists; otherwise stays hidden until the counterpart arrives or the
 * 14-day window expires (src/jobs/review-expiry.ts).
 */
export async function createReview(input: CreateReviewInput): Promise<ActionResult<{ id: string }>> {
  const user = await requireAuth();

  const rateLimit = await checkRateLimit(`review:${user.id}`, RATE_LIMITS.REVIEW_SUBMIT);
  if (!rateLimit.allowed) {
    return {
      success: false,
      error: {
        code: "RATE_LIMITED",
        message: `Too many reviews submitted. Please try again in ${rateLimit.retryAfterSeconds}s.`,
      },
    };
  }

  const parsed = createReviewSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid review",
        fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      },
    };
  }
  const data = parsed.data;

  const booking = await prisma.booking.findUnique({
    where: { id: data.bookingId },
    select: { id: true, listingId: true, guestId: true, hostId: true, status: true },
  });
  if (!booking) {
    return { success: false, error: { code: "NOT_FOUND", message: "Booking not found" } };
  }
  // Domain Model Spec §2.10 validation rule (more specific than the Blueprint's
  // §8 "Completed only" summary — a terminated-early lease still had a real,
  // reviewable stay). Reconciled in docs/architecture/architecture-decision-record.md ADR-024.
  if (booking.status !== "COMPLETED" && booking.status !== "TERMINATED_EARLY") {
    return {
      success: false,
      error: { code: "INVALID_STATE", message: "Only completed bookings can be reviewed" },
    };
  }

  const direction =
    booking.guestId === user.id ? "GUEST_TO_HOST" : booking.hostId === user.id ? "HOST_TO_GUEST" : null;
  if (!direction) {
    return { success: false, error: { code: "FORBIDDEN", message: "You were not part of this booking" } };
  }
  if (direction === "HOST_TO_GUEST" && data.subRatings) {
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message: "Sub-ratings only apply to guest reviews of a listing" },
    };
  }

  const existing = await prisma.review.findUnique({
    where: { bookingId_direction: { bookingId: booking.id, direction } },
    select: { id: true },
  });
  if (existing) {
    return { success: false, error: { code: "CONFLICT", message: "You already reviewed this booking" } };
  }

  const counterpartDirection = direction === "GUEST_TO_HOST" ? "HOST_TO_GUEST" : "GUEST_TO_HOST";

  const review = await prisma.$transaction(async (tx) => {
    const created = await tx.review.create({
      data: {
        bookingId: booking.id,
        listingId: booking.listingId,
        authorId: user.id,
        direction,
        rating: data.rating,
        subRatings: direction === "GUEST_TO_HOST" ? (data.subRatings ?? undefined) : undefined,
        comment: data.comment,
        isVisible: false,
      },
    });

    const counterpart = await tx.review.findUnique({
      where: { bookingId_direction: { bookingId: booking.id, direction: counterpartDirection } },
      select: { id: true, rating: true },
    });

    if (counterpart) {
      const publishedAt = new Date();
      await tx.review.updateMany({
        where: { id: { in: [created.id, counterpart.id] } },
        data: { isVisible: true, publishedAt },
      });
      await recomputeListingRating(tx, booking.listingId);
    }

    return { created, counterpart };
  });

  const listing = await prisma.listing.findUnique({
    where: { id: booking.listingId },
    select: { title: true, slug: true },
  });

  if (review.counterpart) {
    const listingTitle = listing?.title ?? "your listing";
    const hostReviewId = direction === "GUEST_TO_HOST" ? review.created.id : review.counterpart.id;
    const hostRating = direction === "GUEST_TO_HOST" ? data.rating : review.counterpart.rating;
    const guestReviewId = direction === "HOST_TO_GUEST" ? review.created.id : review.counterpart.id;
    const guestRating = direction === "HOST_TO_GUEST" ? data.rating : review.counterpart.rating;

    await notify(booking.hostId, "REVIEW_RECEIVED", {
      reviewId: hostReviewId,
      bookingId: booking.id,
      listingTitle,
      rating: hostRating,
    });
    await notify(booking.guestId, "REVIEW_RECEIVED", {
      reviewId: guestReviewId,
      bookingId: booking.id,
      listingTitle,
      rating: guestRating,
    });
  }

  // A bare "/listing-stay-detail" isn't a real route (only the dynamic
  // "/listing-stay-detail/[slug]" child is) and revalidatePath doesn't
  // cascade to it, so this was silently failing to invalidate the actual
  // listing page's cache.
  if (listing?.slug) {
    revalidatePath(`/listing-stay-detail/${listing.slug}`);
  }
  revalidatePath("/account-bookings");

  return { success: true, data: { id: review.created.id } };
}

/** One public reply per GUEST_TO_HOST review, host-authored only (Domain Model Spec §2.10). */
export async function respondToReview(input: RespondToReviewInput): Promise<ActionResult<{ id: string }>> {
  const user = await requireAuth();

  const parsed = respondToReviewSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid response" } };
  }

  const review = await prisma.review.findUnique({
    where: { id: parsed.data.reviewId },
    include: { listing: { select: { hostId: true, slug: true } } },
  });
  if (!review) {
    return { success: false, error: { code: "NOT_FOUND", message: "Review not found" } };
  }
  if (review.direction !== "GUEST_TO_HOST") {
    return {
      success: false,
      error: { code: "INVALID_STATE", message: "Only guest reviews of a listing can be responded to" },
    };
  }
  if (review.listing.hostId !== user.id) {
    return { success: false, error: { code: "FORBIDDEN", message: "You do not own this listing" } };
  }
  if (review.hostResponse) {
    return { success: false, error: { code: "CONFLICT", message: "This review already has a response" } };
  }

  await prisma.review.update({
    where: { id: review.id },
    data: { hostResponse: parsed.data.response },
  });

  revalidatePath(`/listing-stay-detail/${review.listing.slug}`);

  return { success: true, data: { id: review.id } };
}

/** Admin moderation: soft-hide a review that violates content policy (Domain Model Spec §2.10 permissions). Always audit-logged, never a hard delete. */
export async function hideReview(input: ReviewIdInput): Promise<ActionResult<{ id: string }>> {
  const admin = await requireAdmin();

  const parsed = reviewIdSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid request" } };
  }

  const review = await prisma.review.findUnique({
    where: { id: parsed.data.reviewId },
    include: { listing: { select: { slug: true } } },
  });
  if (!review) {
    return { success: false, error: { code: "NOT_FOUND", message: "Review not found" } };
  }
  if (!review.isVisible) {
    return { success: false, error: { code: "INVALID_STATE", message: "This review is already hidden" } };
  }

  await prisma.$transaction(async (tx) => {
    await tx.review.update({ where: { id: review.id }, data: { isVisible: false } });
    if (review.direction === "GUEST_TO_HOST") {
      await recomputeListingRating(tx, review.listingId);
    }
    await tx.auditLog.create({
      data: {
        actorId: admin.id,
        action: "REVIEW_HIDDEN",
        targetType: "Review",
        targetId: review.id,
      },
    });
  });

  // A bare "/listing-stay-detail" isn't a real route (only the dynamic
  // "/listing-stay-detail/[slug]" child is) and revalidatePath doesn't
  // cascade to it, so this was silently failing to invalidate the actual
  // listing page's cache.
  revalidatePath(`/listing-stay-detail/${review.listing.slug}`);

  return { success: true, data: { id: review.id } };
}
