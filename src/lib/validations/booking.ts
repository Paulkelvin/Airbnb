import { z } from "zod";

export const createShortTermBookingSchema = z
  .object({
    listingId: z.string().uuid(),
    checkInDate: z.coerce.date(),
    checkOutDate: z.coerce.date(),
    guestCount: z.coerce.number().int().min(1),
    // Client-generated per the domain model spec — a retried/duplicate
    // submission with the same key returns the original booking instead
    // of creating a second one and double-charging.
    idempotencyKey: z.string().uuid(),
  })
  .refine((data) => data.checkOutDate > data.checkInDate, {
    message: "Check-out date must be after check-in date",
    path: ["checkOutDate"],
  })
  .refine((data) => data.checkInDate >= new Date(new Date().toDateString()), {
    message: "Check-in date cannot be in the past",
    path: ["checkInDate"],
  });

export const createLongTermBookingSchema = z.object({
  listingId: z.string().uuid(),
  leaseStartDate: z.coerce.date(),
  leaseTermMonths: z.coerce.number().int().min(1),
  idempotencyKey: z.string().uuid(),
});

export const cancelBookingSchema = z.object({
  bookingId: z.string().uuid(),
  reason: z.string().max(1000).optional(),
});

export const acceptDeclineBookingSchema = z.object({
  bookingId: z.string().uuid(),
  reason: z.string().max(1000).optional(),
});

export const terminateLeaseSchema = z.object({
  bookingId: z.string().uuid(),
  terminationDate: z.coerce.date(),
  reason: z.string().max(1000).optional(),
});

export type CreateShortTermBookingInput = z.infer<typeof createShortTermBookingSchema>;
export type CreateLongTermBookingInput = z.infer<typeof createLongTermBookingSchema>;
export type CancelBookingInput = z.infer<typeof cancelBookingSchema>;
export type AcceptDeclineBookingInput = z.infer<typeof acceptDeclineBookingSchema>;
export type TerminateLeaseInput = z.infer<typeof terminateLeaseSchema>;
