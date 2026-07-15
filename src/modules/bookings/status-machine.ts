import type { BookingStatus, RentalType } from "@prisma/client";

/**
 * The single source of truth for valid Booking status transitions
 * (ADR-003: "centralizing all transitions through one canTransition
 * function, never ad hoc status writes scattered across modules").
 * Status subsets differ by rentalType per the Domain Model Spec §2.9
 * lifecycle diagrams — this is the application-layer enforcement of that
 * rule, since the schema uses one shared status column for both types.
 */

const SHORT_TERM_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  PENDING: ["CONFIRMED", "DECLINED", "CANCELLED_BY_GUEST"],
  // CONFIRMED/CHECKED_IN -> DISPUTED: a chargeback can be filed any time after the
  // guest's card is charged (at CONFIRMED), not only after the stay completes —
  // Domain Model Spec §2.14: a CHARGEBACK "flags the related Booking for admin
  // review", independent of lifecycle stage.
  CONFIRMED: ["CHECKED_IN", "CANCELLED_BY_GUEST", "CANCELLED_BY_HOST", "DISPUTED"],
  CHECKED_IN: ["COMPLETED", "CANCELLED_BY_HOST", "DISPUTED"],
  COMPLETED: ["DISPUTED"],
  DECLINED: [],
  CANCELLED_BY_GUEST: [],
  CANCELLED_BY_HOST: [],
  DISPUTED: [],
  // Long-term-only statuses are never valid on a short-term booking.
  ACTIVE: [],
  TERMINATED_EARLY: [],
};

const LONG_TERM_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  PENDING: ["CONFIRMED", "DECLINED", "CANCELLED_BY_GUEST"],
  // CONFIRMED -> DISPUTED: a chargeback on the security-deposit hold can be filed
  // as soon as it's charged (at CONFIRMED), before the lease is even ACTIVE.
  CONFIRMED: ["ACTIVE", "CANCELLED_BY_GUEST", "CANCELLED_BY_HOST", "DISPUTED"],
  ACTIVE: ["COMPLETED", "TERMINATED_EARLY", "DISPUTED"],
  COMPLETED: ["DISPUTED"],
  TERMINATED_EARLY: ["DISPUTED"],
  DECLINED: [],
  CANCELLED_BY_GUEST: [],
  CANCELLED_BY_HOST: [],
  DISPUTED: [],
  // Short-term-only status is never valid on a long-term booking.
  CHECKED_IN: [],
};

export function canTransition(
  current: BookingStatus,
  next: BookingStatus,
  rentalType: RentalType,
): boolean {
  const table = rentalType === "SHORT_TERM" ? SHORT_TERM_TRANSITIONS : LONG_TERM_TRANSITIONS;
  return table[current]?.includes(next) ?? false;
}

export class InvalidTransitionError extends Error {
  constructor(current: BookingStatus, next: BookingStatus, rentalType: RentalType) {
    super(`Cannot transition ${rentalType} booking from ${current} to ${next}`);
    this.name = "InvalidTransitionError";
  }
}

export function assertTransition(
  current: BookingStatus,
  next: BookingStatus,
  rentalType: RentalType,
): void {
  if (!canTransition(current, next, rentalType)) {
    throw new InvalidTransitionError(current, next, rentalType);
  }
}
