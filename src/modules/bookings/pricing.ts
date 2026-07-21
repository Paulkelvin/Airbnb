import { computeServiceFeeDollars, roundToCents } from "@/lib/pricing-policy";

/**
 * Line-item price quote for a short-term stay. Distinct from
 * `src/lib/pricing-policy.ts`, which owns the fee percentage and refund
 * tiers — this module owns how those policies combine with a listing's
 * nightly rate and length-of-stay discounts into a bookable total.
 */
export interface ShortTermQuoteInput {
  nightlyPrice: number;
  cleaningFee: number | null;
  weeklyDiscountPercent: number | null;
  monthlyDiscountPercent: number | null;
  nights: number;
  /** Fraction (0-1) of subtotal charged as the guest service fee. Defaults to the platform constant. */
  serviceFeePercent?: number;
}

export interface ShortTermQuote {
  nights: number;
  nightlyRate: number;
  nightlyTotal: number;
  discountPercent: number;
  discountAmount: number;
  cleaningFee: number;
  /** Nightly total minus discount, plus cleaning fee — the service-fee basis. */
  subtotal: number;
  serviceFee: number;
  totalPrice: number;
}

/** Longer stays earn the best applicable discount; monthly (30+ nights) takes precedence over weekly (7+ nights). */
export function computeShortTermQuote(input: ShortTermQuoteInput): ShortTermQuote {
  const nightlyTotal = roundToCents(input.nightlyPrice * input.nights);

  let discountPercent = 0;
  if (input.nights >= 30 && input.monthlyDiscountPercent) {
    discountPercent = input.monthlyDiscountPercent;
  } else if (input.nights >= 7 && input.weeklyDiscountPercent) {
    discountPercent = input.weeklyDiscountPercent;
  }

  const discountAmount = roundToCents(nightlyTotal * (discountPercent / 100));
  const cleaningFee = input.cleaningFee ?? 0;
  const subtotal = roundToCents(nightlyTotal - discountAmount + cleaningFee);
  const serviceFee = computeServiceFeeDollars(subtotal, input.serviceFeePercent);
  const totalPrice = roundToCents(subtotal + serviceFee);

  return {
    nights: input.nights,
    nightlyRate: input.nightlyPrice,
    nightlyTotal,
    discountPercent,
    discountAmount,
    cleaningFee,
    subtotal,
    serviceFee,
    totalPrice,
  };
}

export interface LongTermQuote {
  monthlyRent: number;
  securityDeposit: number;
}

export function computeLongTermQuote(
  monthlyRent: number,
  securityDeposit: number | null,
): LongTermQuote {
  return { monthlyRent, securityDeposit: securityDeposit ?? 0 };
}

/** Inclusive of checkInDate, exclusive of checkOutDate — standard hotel-night convention. */
export function nightsBetween(checkInDate: Date, checkOutDate: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.round((checkOutDate.getTime() - checkInDate.getTime()) / msPerDay);
}

/**
 * Snaps a Date to UTC midnight of whatever UTC calendar day it falls on.
 *
 * checkInDate/checkOutDate reach the server as plain Date instants with no
 * timezone metadata, but they're constructed two different ways on the
 * client: react-datepicker builds them at *local* midnight, while dates
 * round-tripped through a "?checkIn=2026-07-25" URL param get parsed as
 * *UTC* midnight (date-only ISO strings parse as UTC per spec). For any
 * guest in a negative UTC offset (all of the US), both of those land on the
 * same UTC calendar day — but only once normalized here. Without this, the
 * Availability table's @@unique([listingId, date]) constraint — the only
 * thing actually preventing a double-booking — can silently fail to catch
 * two bookings for "the same night" that differ by a few hours in their
 * raw timestamp, because they were entered through different pages.
 * Call this on every checkInDate/checkOutDate the instant it's received,
 * before it's used for nights, quotes, or Availability rows.
 */
export function toCalendarDateUTC(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function datesInRange(checkInDate: Date, checkOutDate: Date): Date[] {
  const dates: Date[] = [];
  const cursor = new Date(checkInDate);
  while (cursor < checkOutDate) {
    dates.push(new Date(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

export function addMonthsUTC(date: Date, months: number): Date {
  const result = new Date(date);
  result.setUTCMonth(result.getUTCMonth() + months);
  return result;
}
