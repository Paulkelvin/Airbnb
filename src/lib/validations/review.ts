import { z } from "zod";

const subRatingsSchema = z.object({
  cleanliness: z.coerce.number().int().min(1).max(5),
  communication: z.coerce.number().int().min(1).max(5),
  accuracy: z.coerce.number().int().min(1).max(5),
  location: z.coerce.number().int().min(1).max(5),
  value: z.coerce.number().int().min(1).max(5),
});

export const createReviewSchema = z.object({
  bookingId: z.string().uuid(),
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().min(1).max(2000),
  /** GUEST_TO_HOST only — the action strips/rejects this for a host's review of a guest. */
  subRatings: subRatingsSchema.optional(),
});

export const respondToReviewSchema = z.object({
  reviewId: z.string().uuid(),
  response: z.string().min(1).max(2000),
});

export const reviewIdSchema = z.object({
  reviewId: z.string().uuid(),
});

export type CreateReviewInput = z.infer<typeof createReviewSchema>;
export type RespondToReviewInput = z.infer<typeof respondToReviewSchema>;
export type ReviewIdInput = z.infer<typeof reviewIdSchema>;
