/**
 * Single source of truth for money-affecting business constants and the
 * policy-driven refund calculators the architecture requires ("refund
 * amount is policy-driven, computed server-side" — Platform Architecture
 * Blueprint §3). Exact tier percentages and thresholds are a product
 * decision (not specified in the ADRs), confirmed by the client:
 *   - Short-term cancellation: industry-standard tiers
 *   - Long-term early termination (STANDARD): linear 30-day proration
 *   - Guest service fee: 10% of subtotal by default, admin-configurable
 *     via the "serviceFeePercent" platform setting (`getServiceFeePercent`
 *     in `@/modules/admin/settings`) — pass the resolved fraction through
 *     rather than re-deriving it, so quote math stays in one place.
 *
 * Nothing outside this file should hardcode a refund tier or proration
 * formula — change the constants here, not call sites.
 */

import type { CancellationPolicy, EarlyTerminationPolicy } from "@prisma/client";

/** Default guest-side service fee, as a fraction of subtotal — used until the admin sets a different value. */
export const SERVICE_FEE_PERCENT = 0.1;

/** Notice window (days) for full deposit refund under a STANDARD early-termination policy. */
export const STANDARD_TERMINATION_FULL_REFUND_NOTICE_DAYS = 30;

export function computeServiceFee(subtotalCents: number, feePercent: number = SERVICE_FEE_PERCENT): number {
  return Math.round(subtotalCents * feePercent);
}

/**
 * Dollar-precision (2 decimal places) equivalent of {@link computeServiceFee},
 * for `Booking.serviceFee` and other `Decimal(10,2)` dollar fields — never
 * pass a dollar amount to the cents-precision functions above, since their
 * `Math.round()` operates on whole cents and would collapse sub-cent dollar
 * precision (e.g. $85.50 * 0.10 = $8.55, not $9).
 */
export function computeServiceFeeDollars(subtotal: number, feePercent: number = SERVICE_FEE_PERCENT): number {
  return roundToCents(subtotal * feePercent);
}

/** Round a dollar amount to 2 decimal places (whole cents), avoiding float drift. */
export function roundToCents(dollars: number): number {
  return Math.round(dollars * 100) / 100;
}

/** Convert a `Decimal(10,2)` dollar amount to integer minor units for `Payment.amount`/PaymentProvider calls. */
export function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100);
}

interface RefundTier {
  /** Refund percentage (0-1) if the cancellation happens at least this many hours before check-in. */
  minHoursBeforeCheckIn: number;
  refundPercent: number;
}

// Ordered highest-notice-first; the first tier whose threshold is met wins.
const CANCELLATION_TIERS: Record<CancellationPolicy, RefundTier[]> = {
  FLEXIBLE: [
    { minHoursBeforeCheckIn: 24, refundPercent: 1 },
    { minHoursBeforeCheckIn: 0, refundPercent: 0 },
  ],
  MODERATE: [
    { minHoursBeforeCheckIn: 5 * 24, refundPercent: 1 },
    { minHoursBeforeCheckIn: 24, refundPercent: 0.5 },
    { minHoursBeforeCheckIn: 0, refundPercent: 0 },
  ],
  STRICT: [
    { minHoursBeforeCheckIn: 7 * 24, refundPercent: 0.5 },
    { minHoursBeforeCheckIn: 0, refundPercent: 0 },
  ],
};

/**
 * Refund percentage (0-1) for a short-term cancellation, given the policy,
 * the listing's check-in date, and when the cancellation happens.
 */
export function computeCancellationRefundPercent(
  policy: CancellationPolicy,
  checkInDate: Date,
  cancelledAt: Date = new Date(),
): number {
  const hoursBeforeCheckIn = (checkInDate.getTime() - cancelledAt.getTime()) / (1000 * 60 * 60);
  const tiers = CANCELLATION_TIERS[policy];
  for (const tier of tiers) {
    if (hoursBeforeCheckIn >= tier.minHoursBeforeCheckIn) {
      return tier.refundPercent;
    }
  }
  return 0;
}

/**
 * Human-readable refund tiers for a cancellation policy, derived from the
 * same {@link CANCELLATION_TIERS} table the refund math uses — so guest-
 * facing copy can never drift from what a cancellation would actually pay
 * out. Ordered highest-notice-first, matching the tiers themselves.
 */
export function describeCancellationPolicy(policy: CancellationPolicy): string[] {
  return CANCELLATION_TIERS[policy].map((tier) => {
    const refundLabel =
      tier.refundPercent === 1
        ? "Full refund"
        : tier.refundPercent === 0
          ? "No refund"
          : `${Math.round(tier.refundPercent * 100)}% refund`;

    if (tier.minHoursBeforeCheckIn === 0) {
      return `${refundLabel} if you cancel less than 24 hours before check-in`;
    }
    const days = tier.minHoursBeforeCheckIn / 24;
    const windowLabel = Number.isInteger(days)
      ? `${days} day${days !== 1 ? "s" : ""}`
      : `${tier.minHoursBeforeCheckIn} hours`;
    return `${refundLabel} if you cancel at least ${windowLabel} before check-in`;
  });
}

export function computeCancellationRefundCents(
  policy: CancellationPolicy,
  checkInDate: Date,
  totalPriceCents: number,
  cancelledAt: Date = new Date(),
): number {
  const percent = computeCancellationRefundPercent(policy, checkInDate, cancelledAt);
  return Math.round(totalPriceCents * percent);
}

/** Dollar-precision equivalent of {@link computeCancellationRefundCents}, for `Booking.totalPrice`. */
export function computeCancellationRefundDollars(
  policy: CancellationPolicy,
  checkInDate: Date,
  totalPrice: number,
  cancelledAt: Date = new Date(),
): number {
  const percent = computeCancellationRefundPercent(policy, checkInDate, cancelledAt);
  return roundToCents(totalPrice * percent);
}

/**
 * Refund percentage (0-1) for a long-term security deposit on early
 * termination, given the policy, the termination date, and when notice was given.
 */
export function computeEarlyTerminationRefundPercent(
  policy: EarlyTerminationPolicy,
  terminationDate: Date,
  noticeGivenAt: Date = new Date(),
): number {
  if (policy === "STRICT") return 0;

  const noticeDays = Math.max(
    0,
    (terminationDate.getTime() - noticeGivenAt.getTime()) / (1000 * 60 * 60 * 24),
  );
  return Math.min(1, noticeDays / STANDARD_TERMINATION_FULL_REFUND_NOTICE_DAYS);
}

export function computeEarlyTerminationRefundCents(
  policy: EarlyTerminationPolicy,
  terminationDate: Date,
  securityDepositCents: number,
  noticeGivenAt: Date = new Date(),
): number {
  const percent = computeEarlyTerminationRefundPercent(policy, terminationDate, noticeGivenAt);
  return Math.round(securityDepositCents * percent);
}

/** Dollar-precision equivalent of {@link computeEarlyTerminationRefundCents}, for `Booking.securityDepositSnapshot`. */
export function computeEarlyTerminationRefundDollars(
  policy: EarlyTerminationPolicy,
  terminationDate: Date,
  securityDeposit: number,
  noticeGivenAt: Date = new Date(),
): number {
  const percent = computeEarlyTerminationRefundPercent(policy, terminationDate, noticeGivenAt);
  return roundToCents(securityDeposit * percent);
}
