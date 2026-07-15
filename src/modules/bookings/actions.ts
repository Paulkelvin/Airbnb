"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAuth, requireOwnership, AuthError } from "@/lib/auth";
import { getPaymentProvider } from "@/lib/payments/stub-provider";
import {
  dollarsToCents,
  computeCancellationRefundDollars,
  computeEarlyTerminationRefundDollars,
} from "@/lib/pricing-policy";
import {
  createShortTermBookingSchema,
  createLongTermBookingSchema,
  cancelBookingSchema,
  acceptDeclineBookingSchema,
  terminateLeaseSchema,
  type CreateShortTermBookingInput,
  type CreateLongTermBookingInput,
  type CancelBookingInput,
  type AcceptDeclineBookingInput,
  type TerminateLeaseInput,
} from "@/lib/validations/booking";
import type { ActionResult } from "@/lib/validations/auth";
import { computeShortTermQuote, computeLongTermQuote, nightsBetween, datesInRange, addMonthsUTC } from "./pricing";
import { getListingForBooking } from "./queries";
import { assertTransition, canTransition, InvalidTransitionError } from "./status-machine";

const DOUBLE_BOOKED_ERROR = {
  code: "DATES_UNAVAILABLE",
  message: "These dates are no longer available. Please choose different dates.",
};

/**
 * P2002's `meta.target` is an array of column names when Prisma recognizes the
 * constraint from the schema (e.g. `@@unique([listingId, date])`), but falls
 * back to the raw index name as a string for constraints it doesn't own (e.g.
 * `Booking_one_active_lease_per_listing`, added via raw SQL in the migration).
 * `fields` matches the array form; `indexNameFragment` matches the string form.
 */
function isUniqueConstraintOn(
  err: unknown,
  fields: string[],
  indexNameFragment: string,
): boolean {
  if (!(err instanceof Prisma.PrismaClientKnownRequestError) || err.code !== "P2002") {
    return false;
  }
  const target = err.meta?.target;
  if (Array.isArray(target)) {
    return target.length === fields.length && fields.every((f) => target.includes(f));
  }
  if (typeof target === "string") {
    return target.includes(indexNameFragment);
  }
  return false;
}

export async function createShortTermBooking(
  input: CreateShortTermBookingInput,
): Promise<ActionResult<{ id: string }>> {
  const user = await requireAuth();

  const parsed = createShortTermBookingSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid booking request",
        fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      },
    };
  }
  const data = parsed.data;

  const existing = await prisma.booking.findUnique({
    where: { idempotencyKey: data.idempotencyKey },
    select: { id: true },
  });
  if (existing) {
    return { success: true, data: { id: existing.id } };
  }

  const listing = await getListingForBooking(data.listingId);
  if (!listing || listing.status !== "PUBLISHED" || listing.rentalType !== "SHORT_TERM") {
    return { success: false, error: { code: "NOT_FOUND", message: "Listing not found" } };
  }
  if (listing.hostId === user.id) {
    return {
      success: false,
      error: { code: "FORBIDDEN", message: "You cannot book your own listing" },
    };
  }

  const nights = nightsBetween(data.checkInDate, data.checkOutDate);
  const minNights = listing.minNights ?? 1;
  if (nights < minNights || (listing.maxNights && nights > listing.maxNights)) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message:
          listing.maxNights && nights > listing.maxNights
            ? `This listing allows at most ${listing.maxNights} nights`
            : `This listing requires a minimum stay of ${minNights} nights`,
      },
    };
  }
  if (data.guestCount > listing.maxOccupants) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: `This listing sleeps at most ${listing.maxOccupants} guests`,
      },
    };
  }

  const quote = computeShortTermQuote({
    nightlyPrice: Number(listing.nightlyPrice),
    cleaningFee: listing.cleaningFee ? Number(listing.cleaningFee) : null,
    weeklyDiscountPercent: listing.weeklyDiscountPercent
      ? Number(listing.weeklyDiscountPercent)
      : null,
    monthlyDiscountPercent: listing.monthlyDiscountPercent
      ? Number(listing.monthlyDiscountPercent)
      : null,
    nights,
  });

  const nightDates = datesInRange(data.checkInDate, data.checkOutDate);
  const initialStatus = listing.instantBook ? "CONFIRMED" : "PENDING";

  let bookingId: string;
  try {
    bookingId = await prisma.$transaction(async (tx) => {
      const booking = await tx.booking.create({
        data: {
          listingId: listing.id,
          guestId: user.id,
          hostId: listing.hostId,
          rentalType: "SHORT_TERM",
          status: initialStatus,
          currency: listing.currency,
          idempotencyKey: data.idempotencyKey,
          checkInDate: data.checkInDate,
          checkOutDate: data.checkOutDate,
          nights,
          guestCount: data.guestCount,
          nightlyRateSnapshot: quote.nightlyRate,
          cleaningFeeSnapshot: quote.cleaningFee,
          subtotal: quote.subtotal,
          serviceFee: quote.serviceFee,
          totalPrice: quote.totalPrice,
        },
        select: { id: true },
      });

      await tx.availability.createMany({
        data: nightDates.map((date) => ({
          listingId: listing.id,
          date,
          status: "BOOKED",
          bookingId: booking.id,
        })),
      });

      if (initialStatus === "CONFIRMED") {
        await chargeBookingTx(tx, {
          bookingId: booking.id,
          payerUserId: user.id,
          payeeUserId: listing.hostId,
          amountDollars: quote.totalPrice,
          currency: listing.currency,
        });
      }

      return booking.id;
    });
  } catch (err) {
    if (isUniqueConstraintOn(err, ["listingId", "date"], "Availability_listingId_date_key")) {
      return { success: false, error: DOUBLE_BOOKED_ERROR };
    }
    throw err;
  }

  revalidatePath(`/listing-stay-detail/${listing.slug}`);
  revalidatePath("/account-bookings");

  return { success: true, data: { id: bookingId } };
}

export async function createLongTermBooking(
  input: CreateLongTermBookingInput,
): Promise<ActionResult<{ id: string }>> {
  const user = await requireAuth();

  const parsed = createLongTermBookingSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid booking request",
        fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      },
    };
  }
  const data = parsed.data;

  const existing = await prisma.booking.findUnique({
    where: { idempotencyKey: data.idempotencyKey },
    select: { id: true },
  });
  if (existing) {
    return { success: true, data: { id: existing.id } };
  }

  const listing = await getListingForBooking(data.listingId);
  if (!listing || listing.status !== "PUBLISHED" || listing.rentalType !== "LONG_TERM") {
    return { success: false, error: { code: "NOT_FOUND", message: "Listing not found" } };
  }
  if (listing.hostId === user.id) {
    return {
      success: false,
      error: { code: "FORBIDDEN", message: "You cannot apply to your own listing" },
    };
  }

  const today = new Date(new Date().toDateString());
  if (data.leaseStartDate < today) {
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message: "Lease start date cannot be in the past" },
    };
  }
  if (listing.availableFromDate && data.leaseStartDate < listing.availableFromDate) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: `This listing is not available before ${listing.availableFromDate.toISOString().slice(0, 10)}`,
      },
    };
  }
  const minTerm = listing.minLeaseTermMonths ?? 1;
  if (
    data.leaseTermMonths < minTerm ||
    (listing.maxLeaseTermMonths && data.leaseTermMonths > listing.maxLeaseTermMonths)
  ) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message:
          listing.maxLeaseTermMonths && data.leaseTermMonths > listing.maxLeaseTermMonths
            ? `This listing allows a lease term of at most ${listing.maxLeaseTermMonths} months`
            : `This listing requires a minimum lease term of ${minTerm} months`,
      },
    };
  }

  const leaseEndDate = addMonthsUTC(data.leaseStartDate, data.leaseTermMonths);
  const quote = computeLongTermQuote(
    Number(listing.monthlyRent),
    listing.securityDeposit ? Number(listing.securityDeposit) : null,
  );

  const booking = await prisma.booking.create({
    data: {
      listingId: listing.id,
      guestId: user.id,
      hostId: listing.hostId,
      rentalType: "LONG_TERM",
      status: "PENDING",
      currency: listing.currency,
      idempotencyKey: data.idempotencyKey,
      leaseStartDate: data.leaseStartDate,
      leaseEndDate,
      leaseTermMonths: data.leaseTermMonths,
      monthlyRentSnapshot: quote.monthlyRent,
      securityDepositSnapshot: quote.securityDeposit,
      securityDepositPaid: false,
      // Rent recurs on the same day-of-month as move-in — read by the monthly rent-charging job.
      rentDueDayOfMonth: data.leaseStartDate.getUTCDate(),
    },
    select: { id: true },
  });

  revalidatePath(`/listing-stay-detail/${listing.slug}`);
  revalidatePath("/account-bookings");

  return { success: true, data: { id: booking.id } };
}

type Tx = Prisma.TransactionClient;

async function chargeBookingTx(
  tx: Tx,
  args: {
    bookingId: string;
    payerUserId: string;
    payeeUserId: string;
    amountDollars: number;
    currency: string;
    type?: "CHARGE" | "SECURITY_DEPOSIT_HOLD";
  },
) {
  const amountCents = dollarsToCents(args.amountDollars);
  const provider = getPaymentProvider();
  const result = await provider.createCharge(amountCents, args.currency, args.payerUserId, {
    bookingId: args.bookingId,
    payerUserId: args.payerUserId,
    payeeUserId: args.payeeUserId,
    type: args.type ?? "CHARGE",
  });

  if (result.status !== "SUCCEEDED") {
    throw new Error(result.failureReason ?? "Payment failed");
  }

  await tx.payment.create({
    data: {
      bookingId: args.bookingId,
      payerUserId: args.payerUserId,
      payeeUserId: args.payeeUserId,
      type: args.type ?? "CHARGE",
      amount: amountCents,
      currency: args.currency,
      provider: "STRIPE_CONNECT",
      providerTransactionRef: result.providerTransactionRef,
      status: "SUCCEEDED",
    },
  });

  return result;
}

async function refundBookingTx(
  tx: Tx,
  args: {
    bookingId: string;
    payerUserId: string;
    payeeUserId: string;
    amountDollars: number;
    currency: string;
    originalProviderTransactionRef: string;
    type?: "REFUND" | "SECURITY_DEPOSIT_RELEASE";
  },
) {
  if (args.amountDollars <= 0) return null;

  const amountCents = dollarsToCents(args.amountDollars);
  const provider = getPaymentProvider();
  const result = await provider.refund(args.originalProviderTransactionRef, amountCents);

  await tx.payment.create({
    data: {
      bookingId: args.bookingId,
      payerUserId: args.payeeUserId,
      payeeUserId: args.payerUserId,
      type: args.type ?? "REFUND",
      amount: amountCents,
      currency: args.currency,
      provider: "STRIPE_CONNECT",
      providerTransactionRef: result.providerTransactionRef,
      status: result.status === "SUCCEEDED" ? "SUCCEEDED" : "FAILED",
      failureReason: result.failureReason,
    },
  });

  return result;
}

/** Host accepts a PENDING request/application. Charges the guest now if not already charged (instant-book bookings are charged at creation). */
export async function confirmBooking(
  input: AcceptDeclineBookingInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = acceptDeclineBookingSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid request" } };
  }

  const booking = await prisma.booking.findUnique({ where: { id: parsed.data.bookingId } });
  if (!booking) {
    return { success: false, error: { code: "NOT_FOUND", message: "Booking not found" } };
  }

  try {
    await requireOwnership(booking.hostId);
  } catch (err) {
    if (err instanceof AuthError) {
      return { success: false, error: { code: err.code, message: err.message } };
    }
    throw err;
  }

  if (!canTransition(booking.status, "CONFIRMED", booking.rentalType)) {
    return {
      success: false,
      error: { code: "INVALID_STATE", message: "This booking cannot be confirmed right now" },
    };
  }

  try {
    await prisma.$transaction(async (tx) => {
      assertTransition(booking.status, "CONFIRMED", booking.rentalType);

      if (booking.rentalType === "SHORT_TERM" && booking.totalPrice) {
        // instantBook bookings are charged at creation and never reach here as PENDING with no payment.
        await chargeBookingTx(tx, {
          bookingId: booking.id,
          payerUserId: booking.guestId,
          payeeUserId: booking.hostId,
          amountDollars: Number(booking.totalPrice),
          currency: booking.currency,
        });
      }

      if (booking.rentalType === "LONG_TERM" && booking.securityDepositSnapshot !== null) {
        const depositAmount = Number(booking.securityDepositSnapshot);
        if (depositAmount > 0) {
          await chargeBookingTx(tx, {
            bookingId: booking.id,
            payerUserId: booking.guestId,
            payeeUserId: booking.hostId,
            amountDollars: depositAmount,
            currency: booking.currency,
            type: "SECURITY_DEPOSIT_HOLD",
          });
        }
        await tx.booking.update({
          where: { id: booking.id },
          data: { securityDepositPaid: true },
        });
      }

      await tx.booking.update({ where: { id: booking.id }, data: { status: "CONFIRMED" } });
    });
  } catch (err) {
    if (isUniqueConstraintOn(err, ["listingId"], "Booking_one_active_lease_per_listing")) {
      return {
        success: false,
        error: {
          code: "CONFLICT",
          message: "This listing already has an active lease. Decline this application instead.",
        },
      };
    }
    if (err instanceof InvalidTransitionError) {
      return { success: false, error: { code: "INVALID_STATE", message: err.message } };
    }
    throw err;
  }

  revalidatePath("/account-bookings");
  revalidatePath("/account-listings");

  return { success: true, data: { id: booking.id } };
}

/** Host declines a PENDING request/application. No charge was ever made for a PENDING booking, so there's nothing to refund. */
export async function declineBooking(
  input: AcceptDeclineBookingInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = acceptDeclineBookingSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid request" } };
  }

  const booking = await prisma.booking.findUnique({ where: { id: parsed.data.bookingId } });
  if (!booking) {
    return { success: false, error: { code: "NOT_FOUND", message: "Booking not found" } };
  }

  try {
    await requireOwnership(booking.hostId);
  } catch (err) {
    if (err instanceof AuthError) {
      return { success: false, error: { code: err.code, message: err.message } };
    }
    throw err;
  }

  try {
    assertTransition(booking.status, "DECLINED", booking.rentalType);
  } catch (err) {
    if (err instanceof InvalidTransitionError) {
      return { success: false, error: { code: "INVALID_STATE", message: err.message } };
    }
    throw err;
  }

  await prisma.$transaction(async (tx) => {
    await tx.booking.update({
      where: { id: booking.id },
      data: { status: "DECLINED", cancellationReason: parsed.data.reason ?? null },
    });
    if (booking.rentalType === "SHORT_TERM") {
      await tx.availability.deleteMany({ where: { bookingId: booking.id } });
    }
  });

  revalidatePath("/account-bookings");
  revalidatePath("/account-listings");

  return { success: true, data: { id: booking.id } };
}

/** Guest or host cancels a PENDING or CONFIRMED (pre-check-in / pre-move-in) booking. */
export async function cancelBooking(
  input: CancelBookingInput,
): Promise<ActionResult<{ id: string }>> {
  const user = await requireAuth();
  const parsed = cancelBookingSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid request" } };
  }

  const booking = await prisma.booking.findUnique({ where: { id: parsed.data.bookingId } });
  if (!booking) {
    return { success: false, error: { code: "NOT_FOUND", message: "Booking not found" } };
  }

  const isGuest = booking.guestId === user.id;
  const isHost = booking.hostId === user.id;
  const isAdmin = user.roles.includes("ADMIN");
  if (!isGuest && !isHost && !isAdmin) {
    return { success: false, error: { code: "FORBIDDEN", message: "You do not own this booking" } };
  }

  const nextStatus = isGuest && !isHost ? "CANCELLED_BY_GUEST" : "CANCELLED_BY_HOST";

  try {
    assertTransition(booking.status, nextStatus, booking.rentalType);
  } catch (err) {
    if (err instanceof InvalidTransitionError) {
      return { success: false, error: { code: "INVALID_STATE", message: err.message } };
    }
    throw err;
  }

  const wasCharged = booking.status === "CONFIRMED" || booking.status === "CHECKED_IN";

  await prisma.$transaction(async (tx) => {
    if (booking.rentalType === "SHORT_TERM") {
      await tx.availability.deleteMany({ where: { bookingId: booking.id } });

      if (wasCharged && booking.totalPrice && booking.checkInDate) {
        const originalCharge = await tx.payment.findFirst({
          where: { bookingId: booking.id, type: "CHARGE", status: "SUCCEEDED" },
          orderBy: { createdAt: "asc" },
        });
        // Listing's cancellationPolicy isn't snapshotted on Booking, so look it up here.
        const listing = await tx.listing.findUnique({
          where: { id: booking.listingId },
          select: { cancellationPolicy: true },
        });
        if (originalCharge && listing?.cancellationPolicy) {
          const refundDollars = computeCancellationRefundDollars(
            listing.cancellationPolicy,
            booking.checkInDate,
            Number(booking.totalPrice),
          );
          await refundBookingTx(tx, {
            bookingId: booking.id,
            payerUserId: booking.guestId,
            payeeUserId: booking.hostId,
            amountDollars: refundDollars,
            currency: booking.currency,
            originalProviderTransactionRef: originalCharge.providerTransactionRef,
          });
        }
      }
    }

    if (booking.rentalType === "LONG_TERM" && wasCharged && booking.securityDepositSnapshot !== null) {
      // Pre-move-in cancellation: full deposit refund, since the tenant never took occupancy
      // and the early-termination policy is scoped to terminating an ACTIVE lease.
      const originalHold = await tx.payment.findFirst({
        where: { bookingId: booking.id, type: "SECURITY_DEPOSIT_HOLD", status: "SUCCEEDED" },
        orderBy: { createdAt: "asc" },
      });
      if (originalHold) {
        await refundBookingTx(tx, {
          bookingId: booking.id,
          payerUserId: booking.guestId,
          payeeUserId: booking.hostId,
          amountDollars: Number(booking.securityDepositSnapshot),
          currency: booking.currency,
          originalProviderTransactionRef: originalHold.providerTransactionRef,
          type: "SECURITY_DEPOSIT_RELEASE",
        });
      }
    }

    await tx.booking.update({
      where: { id: booking.id },
      data: {
        status: nextStatus,
        cancelledAt: new Date(),
        cancellationReason: parsed.data.reason ?? null,
      },
    });
  });

  revalidatePath("/account-bookings");
  revalidatePath("/account-listings");

  return { success: true, data: { id: booking.id } };
}

/** Long-term only: ends an ACTIVE lease early, refunding the deposit per the listing's early-termination policy. */
export async function terminateLease(
  input: TerminateLeaseInput,
): Promise<ActionResult<{ id: string }>> {
  const user = await requireAuth();
  const parsed = terminateLeaseSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid request" } };
  }

  const booking = await prisma.booking.findUnique({ where: { id: parsed.data.bookingId } });
  if (!booking || booking.rentalType !== "LONG_TERM") {
    return { success: false, error: { code: "NOT_FOUND", message: "Lease not found" } };
  }

  const isGuest = booking.guestId === user.id;
  const isHost = booking.hostId === user.id;
  const isAdmin = user.roles.includes("ADMIN");
  if (!isGuest && !isHost && !isAdmin) {
    return { success: false, error: { code: "FORBIDDEN", message: "You do not own this lease" } };
  }

  try {
    assertTransition(booking.status, "TERMINATED_EARLY", booking.rentalType);
  } catch (err) {
    if (err instanceof InvalidTransitionError) {
      return { success: false, error: { code: "INVALID_STATE", message: err.message } };
    }
    throw err;
  }

  await prisma.$transaction(async (tx) => {
    if (booking.securityDepositSnapshot !== null) {
      const listing = await tx.listing.findUnique({
        where: { id: booking.listingId },
        select: { earlyTerminationPolicy: true },
      });
      const originalHold = await tx.payment.findFirst({
        where: { bookingId: booking.id, type: "SECURITY_DEPOSIT_HOLD", status: "SUCCEEDED" },
        orderBy: { createdAt: "asc" },
      });
      if (listing?.earlyTerminationPolicy && originalHold) {
        const refundDollars = computeEarlyTerminationRefundDollars(
          listing.earlyTerminationPolicy,
          parsed.data.terminationDate,
          Number(booking.securityDepositSnapshot),
        );
        await refundBookingTx(tx, {
          bookingId: booking.id,
          payerUserId: booking.guestId,
          payeeUserId: booking.hostId,
          amountDollars: refundDollars,
          currency: booking.currency,
          originalProviderTransactionRef: originalHold.providerTransactionRef,
          type: "SECURITY_DEPOSIT_RELEASE",
        });
      }
    }

    await tx.booking.update({
      where: { id: booking.id },
      data: {
        status: "TERMINATED_EARLY",
        leaseEndDate: parsed.data.terminationDate,
        cancelledAt: new Date(),
        cancellationReason: parsed.data.reason ?? null,
      },
    });
  });

  revalidatePath("/account-bookings");
  revalidatePath("/account-listings");

  return { success: true, data: { id: booking.id } };
}
