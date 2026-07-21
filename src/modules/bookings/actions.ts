"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAuth, requireOwnership, requireAdmin, AuthError } from "@/lib/auth";
import { getPaymentProvider } from "@/lib/payments";
import { getServiceFeePercent } from "@/modules/admin/settings";
import {
  dollarsToCents,
  computeCancellationRefundDollars,
  computeEarlyTerminationRefundDollars,
} from "@/lib/pricing-policy";
import {
  createShortTermBookingSchema,
  createBookingPaymentIntentSchema,
  createLongTermBookingSchema,
  cancelBookingSchema,
  acceptDeclineBookingSchema,
  terminateLeaseSchema,
  type CreateShortTermBookingInput,
  type CreateBookingPaymentIntentInput,
  type CreateLongTermBookingInput,
  type CancelBookingInput,
  type AcceptDeclineBookingInput,
  type TerminateLeaseInput,
} from "@/lib/validations/booking";
import type { ActionResult } from "@/lib/validations/auth";
import {
  computeShortTermQuote,
  computeLongTermQuote,
  nightsBetween,
  datesInRange,
  addMonthsUTC,
  toCalendarDateUTC,
} from "./pricing";
import { getListingForBooking, isRangeAvailable } from "./queries";
import { assertTransition, canTransition, InvalidTransitionError } from "./status-machine";
import { notify } from "@/modules/notifications/notify";

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
  // See toCalendarDateUTC's doc comment: this is what makes the Availability
  // unique constraint below actually catch double-bookings regardless of
  // which page/flow the dates were entered through.
  data.checkInDate = toCalendarDateUTC(data.checkInDate);
  data.checkOutDate = toCalendarDateUTC(data.checkOutDate);

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

  const serviceFeePercent = (await getServiceFeePercent()) / 100;
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
    serviceFeePercent,
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
          paymentIntentId: data.paymentIntentId,
        });
      }

      return booking.id;
    });
  } catch (err) {
    if (isUniqueConstraintOn(err, ["listingId", "date"], "Availability_listingId_date_key")) {
      // The guest already confirmed payment client-side but the dates were
      // grabbed by someone else between the availability pre-check in
      // createBookingPaymentIntent and this booking-creation attempt. Issue
      // a full refund so the guest isn't charged for a booking that never
      // materialized — fire-and-forget since the DATES_UNAVAILABLE error
      // is the important signal; a refund failure here would surface in
      // Stripe's dashboard or via webhook and is recoverable manually.
      if (data.paymentIntentId) {
        getPaymentProvider()
          .refund(data.paymentIntentId)
          .catch((refundErr) =>
            console.error(
              `Auto-refund failed for PaymentIntent ${data.paymentIntentId}:`,
              refundErr,
            ),
          );
        return {
          success: false,
          error: {
            code: "DATES_UNAVAILABLE",
            message:
              "These dates were just booked by someone else. Your payment will be refunded automatically — please choose different dates.",
          },
        };
      }
      return { success: false, error: DOUBLE_BOOKED_ERROR };
    }
    throw err;
  }

  if (initialStatus === "CONFIRMED") {
    await notify(user.id, "BOOKING_CONFIRMED", {
      bookingId,
      listingTitle: listing.title,
      checkInDate: data.checkInDate.toISOString().slice(0, 10),
      checkOutDate: data.checkOutDate.toISOString().slice(0, 10),
      amount: dollarsToCents(quote.totalPrice),
      currency: listing.currency,
    });
  }

  revalidatePath(`/listing-stay-detail/${listing.slug}`);
  revalidatePath("/account-bookings");

  return { success: true, data: { id: bookingId } };
}

/**
 * Prices a stay and creates an unconfirmed Stripe PaymentIntent for the
 * guest's browser to confirm with their own card via embedded Elements —
 * called before any booking row exists (see createShortTermBooking's
 * paymentIntentId param for what happens once the guest confirms it).
 * Mirrors createShortTermBooking's listing/date/guest validation exactly,
 * since the amount charged here must match what createShortTermBooking
 * computes later — never trust a client-supplied total.
 */
export async function createBookingPaymentIntent(
  input: CreateBookingPaymentIntentInput,
): Promise<ActionResult<{ clientSecret: string; paymentIntentId: string }>> {
  const user = await requireAuth();

  const parsed = createBookingPaymentIntentSchema.safeParse(input);
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
  // Same normalization as createShortTermBooking — this quote must be for
  // the exact same canonical nights that booking creation will later check
  // availability against, or the two could disagree about which dates are
  // being priced.
  data.checkInDate = toCalendarDateUTC(data.checkInDate);
  data.checkOutDate = toCalendarDateUTC(data.checkOutDate);

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

  // A PaymentIntent shouldn't be created for dates someone else already has —
  // this doesn't eliminate the race (a conflicting booking can still land
  // between this check and the eventual createShortTermBooking call, which
  // is why that call re-checks via the Availability unique constraint), but
  // it stops the common case of a guest paying for dates that were already
  // gone before they ever opened the payment form.
  if (!(await isRangeAvailable(listing.id, data.checkInDate, data.checkOutDate))) {
    return { success: false, error: DOUBLE_BOOKED_ERROR };
  }

  const serviceFeePercent = (await getServiceFeePercent()) / 100;
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
    serviceFeePercent,
  });

  const provider = getPaymentProvider();
  const { paymentIntentId, clientSecret } = await provider.createPaymentIntent(
    dollarsToCents(quote.totalPrice),
    listing.currency,
    user.id,
  );

  return { success: true, data: { clientSecret, paymentIntentId } };
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

async function getListingTitle(listingId: string): Promise<string> {
  const listing = await prisma.listing.findUnique({ where: { id: listingId }, select: { title: true } });
  return listing?.title ?? "your listing";
}

/** Never trust a client-supplied paymentIntentId at face value — re-verify
 * server-side that it actually succeeded and for the exact amount the
 * server itself computed, not whatever the client claims. */
async function verifyPaymentAmount(
  provider: ReturnType<typeof getPaymentProvider>,
  paymentIntentId: string,
  expectedAmountCents: number,
  expectedPayerUserId: string,
): Promise<{ providerTransactionRef: string; status: "SUCCEEDED" | "PENDING" | "FAILED"; failureReason?: string }> {
  const verified = await provider.verifyPaymentIntent(paymentIntentId);
  if (verified.amountCents !== expectedAmountCents) {
    return {
      providerTransactionRef: verified.providerTransactionRef,
      status: "FAILED",
      failureReason: "Payment amount does not match the booking total",
    };
  }
  if (verified.payerUserId && verified.payerUserId !== expectedPayerUserId) {
    return {
      providerTransactionRef: verified.providerTransactionRef,
      status: "FAILED",
      failureReason: "Payment was created for a different user",
    };
  }
  return verified;
}

async function chargeBookingTx(
  tx: Tx,
  args: {
    bookingId: string;
    payerUserId: string;
    payeeUserId: string;
    amountDollars: number;
    currency: string;
    type?: "CHARGE" | "SECURITY_DEPOSIT_HOLD";
    /** Set when the guest already confirmed payment client-side via
     * embedded Stripe Elements (isStripeCheckoutConfigured() true) —
     * re-verifies that PaymentIntent instead of creating a new charge, and
     * rejects it outright if its amount doesn't match amountDollars. Absent
     * in stub/dev mode, where createCharge's existing test-card path runs
     * unchanged. */
    paymentIntentId?: string;
  },
) {
  const amountCents = dollarsToCents(args.amountDollars);
  const provider = getPaymentProvider();

  // verifyPaymentAmount only proves the intent is real, succeeded, and for
  // the right amount — a Stripe PaymentIntent can be retrieved and would
  // pass that check as many times as it's presented. Without this lookup,
  // the same succeeded paymentIntentId could be replayed across multiple
  // createShortTermBooking calls (different dates, same total price) to
  // get more than one booking out of a single real charge.
  if (args.paymentIntentId) {
    const alreadyUsed = await tx.payment.findFirst({
      where: { providerTransactionRef: args.paymentIntentId },
      select: { id: true },
    });
    if (alreadyUsed) {
      throw new Error("This payment has already been used for another booking");
    }
  }

  const result = args.paymentIntentId
    ? await verifyPaymentAmount(provider, args.paymentIntentId, amountCents, args.payerUserId)
    : await provider.createCharge(amountCents, args.currency, args.payerUserId, {
        bookingId: args.bookingId,
        payerUserId: args.payerUserId,
        payeeUserId: args.payeeUserId,
        paymentType: args.type ?? "CHARGE",
      });

  // PENDING is a legitimate outcome (Payment lifecycle: PENDING -> SUCCEEDED once a
  // webhook confirms — Domain Model Spec §2.14) — only a definite FAILED rolls back.
  if (result.status === "FAILED") {
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
      status: result.status,
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
    /** The CHARGE/SECURITY_DEPOSIT_HOLD Payment row this refund applies to — required for REFUND/CHARGEBACK per Domain Model Spec §2.14 validation rules. */
    relatedPaymentId: string;
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
      relatedPaymentId: args.relatedPaymentId,
      type: args.type ?? "REFUND",
      amount: amountCents,
      currency: args.currency,
      provider: "STRIPE_CONNECT",
      providerTransactionRef: result.providerTransactionRef,
      status: result.status,
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

  await notify(booking.guestId, "BOOKING_CONFIRMED", {
    bookingId: booking.id,
    listingTitle: await getListingTitle(booking.listingId),
    amount: dollarsToCents(Number(booking.totalPrice ?? booking.monthlyRentSnapshot ?? 0)),
    currency: booking.currency,
  });

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

  await notify(booking.guestId, "BOOKING_CANCELLED", {
    bookingId: booking.id,
    listingTitle: await getListingTitle(booking.listingId),
    cancelledBy: "HOST",
    reason: parsed.data.reason,
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
            relatedPaymentId: originalCharge.id,
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
          relatedPaymentId: originalHold.id,
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

  await notify(nextStatus === "CANCELLED_BY_GUEST" ? booking.hostId : booking.guestId, "BOOKING_CANCELLED", {
    bookingId: booking.id,
    listingTitle: await getListingTitle(booking.listingId),
    cancelledBy: nextStatus === "CANCELLED_BY_GUEST" ? "GUEST" : isHost ? "HOST" : "ADMIN",
    reason: parsed.data.reason,
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
          relatedPaymentId: originalHold.id,
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

  await notify(isGuest ? booking.hostId : booking.guestId, "BOOKING_CANCELLED", {
    bookingId: booking.id,
    listingTitle: await getListingTitle(booking.listingId),
    cancelledBy: isGuest ? "GUEST" : isHost ? "HOST" : "ADMIN",
    reason: parsed.data.reason,
  });

  revalidatePath("/account-bookings");
  revalidatePath("/account-listings");

  return { success: true, data: { id: booking.id } };
}

/**
 * Admin-only dispute resolution. `DISPUTED` is a terminal state in the
 * status machine (no automatic transition out of it), because resolving one
 * is a judgment call, not something the normal cancellation-policy math
 * should decide — so this bypasses `assertTransition` the same way
 * `adminForceBookingTransition` does, but — unlike that function — actually
 * moves money when the resolution sides with the guest, instead of just
 * relabeling the booking's status.
 */
export async function adminResolveDispute(
  bookingId: string,
  resolution: "REFUND_GUEST" | "SIDE_WITH_HOST",
  reason: string,
): Promise<ActionResult<{ id: string }>> {
  const admin = await requireAdmin();

  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) {
    return { success: false, error: { code: "NOT_FOUND", message: "Booking not found" } };
  }
  if (booking.status !== "DISPUTED") {
    return { success: false, error: { code: "INVALID_STATE", message: "Booking is not disputed" } };
  }

  const nextStatus = resolution === "REFUND_GUEST" ? "CANCELLED_BY_HOST" : "COMPLETED";

  await prisma.$transaction(async (tx) => {
    if (resolution === "REFUND_GUEST") {
      const chargeType = booking.rentalType === "SHORT_TERM" ? "CHARGE" : "SECURITY_DEPOSIT_HOLD";
      const originalCharge = await tx.payment.findFirst({
        where: { bookingId: booking.id, type: chargeType, status: "SUCCEEDED" },
        orderBy: { createdAt: "asc" },
      });
      if (originalCharge) {
        await refundBookingTx(tx, {
          bookingId: booking.id,
          payerUserId: booking.guestId,
          payeeUserId: booking.hostId,
          amountDollars: Number(originalCharge.amount) / 100,
          currency: booking.currency,
          originalProviderTransactionRef: originalCharge.providerTransactionRef,
          relatedPaymentId: originalCharge.id,
          type: booking.rentalType === "SHORT_TERM" ? "REFUND" : "SECURITY_DEPOSIT_RELEASE",
        });
      }
    }

    await tx.booking.update({
      where: { id: booking.id },
      data: {
        status: nextStatus,
        cancelledAt: resolution === "REFUND_GUEST" ? new Date() : undefined,
        cancellationReason: resolution === "REFUND_GUEST" ? reason : undefined,
      },
    });
  });

  await prisma.auditLog.create({
    data: {
      actorId: admin.id,
      action: "booking.resolveDispute",
      targetType: "Booking",
      targetId: booking.id,
      metadata: { resolution, reason },
    },
  });

  const listingTitle = await getListingTitle(booking.listingId);
  await Promise.all([
    notify(booking.guestId, "BOOKING_CANCELLED", {
      bookingId: booking.id,
      listingTitle,
      cancelledBy: "ADMIN",
      reason,
    }),
    notify(booking.hostId, "BOOKING_CANCELLED", {
      bookingId: booking.id,
      listingTitle,
      cancelledBy: "ADMIN",
      reason,
    }),
  ]);

  revalidatePath("/admin/bookings");
  revalidatePath("/account-bookings");

  return { success: true, data: { id: booking.id } };
}

/**
 * Manual/admin-triggered host payout for one successful CHARGE payment
 * (ADR-005: separate charges and transfers — a payout is always an
 * explicit, separate step, never automatic on the charge itself).
 * Deliberately not wired to the booking lifecycle: the timing policy for
 * when a payout should fire (on check-in, on completion, after a dispute
 * window, ...) is an open business decision, so this only builds the
 * mechanism — whatever policy is decided later can call this directly.
 */
export async function payoutForPayment(paymentId: string): Promise<ActionResult<{ id: string }>> {
  const admin = await requireAdmin();

  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { booking: { select: { rentalType: true, subtotal: true } } },
  });
  if (!payment || payment.type !== "CHARGE" || payment.status !== "SUCCEEDED") {
    return {
      success: false,
      error: { code: "INVALID_STATE", message: "This payment is not an eligible successful charge" },
    };
  }
  if (!payment.payeeUserId) {
    return {
      success: false,
      error: { code: "INVALID_STATE", message: "This charge has no payee to pay out" },
    };
  }

  const alreadyPaidOut = await prisma.payment.findFirst({
    where: { relatedPaymentId: payment.id, type: "PAYOUT" },
  });
  if (alreadyPaidOut) {
    return {
      success: false,
      error: { code: "CONFLICT", message: "This charge has already been paid out" },
    };
  }

  const host = await prisma.user.findUnique({
    where: { id: payment.payeeUserId },
    select: { payoutAccountRef: true },
  });
  if (!host?.payoutAccountRef) {
    return {
      success: false,
      error: { code: "INVALID_STATE", message: "Host has not completed Stripe Connect onboarding" },
    };
  }

  // Host earns the subtotal, not the guest's totalPrice — the (short-term-only)
  // service fee is platform revenue and never part of the host's payout.
  const payoutAmountCents =
    payment.booking.rentalType === "SHORT_TERM" && payment.booking.subtotal !== null
      ? dollarsToCents(Number(payment.booking.subtotal))
      : payment.amount;

  const provider = getPaymentProvider();
  const result = await provider.payout(host.payoutAccountRef, payoutAmountCents, payment.currency);

  const payout = await prisma.payment.create({
    data: {
      bookingId: payment.bookingId,
      payerUserId: null,
      payeeUserId: payment.payeeUserId,
      relatedPaymentId: payment.id,
      type: "PAYOUT",
      amount: payoutAmountCents,
      currency: payment.currency,
      provider: "STRIPE_CONNECT",
      providerTransactionRef: result.providerTransactionRef,
      status: result.status,
      failureReason: result.failureReason,
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: admin.id,
      action: "payment.payout",
      targetType: "Payment",
      targetId: payout.id,
      metadata: {
        chargePaymentId: payment.id,
        bookingId: payment.bookingId,
        payeeUserId: payment.payeeUserId,
        amount: payoutAmountCents,
        currency: payment.currency,
        status: result.status,
      } as Prisma.InputJsonValue,
    },
  });

  if (result.status === "FAILED") {
    return {
      success: false,
      error: { code: "PAYOUT_FAILED", message: result.failureReason ?? "Payout failed" },
    };
  }

  await notify(payment.payeeUserId, "PAYOUT_SENT", {
    paymentId: payout.id,
    bookingId: payment.bookingId,
    amount: payoutAmountCents,
    currency: payment.currency,
  });

  revalidatePath("/account-bookings");

  return { success: true, data: { id: payout.id } };
}
