import { prisma } from "@/lib/db";
import { canTransition } from "./status-machine";
import { notify } from "@/modules/notifications/notify";

/**
 * Called by the webhook handler (modules/payments) once it has verified and
 * normalized a provider event — never called with raw provider payloads.
 * Owns every mutation to Booking/Payment triggered by an async payment
 * event, per ADR-012's module-boundary rule (payments module orchestrates,
 * booking module owns its own tables).
 *
 * Idempotency follows Domain Model Spec §2.14 exactly: before acting, check
 * whether the relevant Payment already reflects this outcome, and
 * short-circuit if so — providers do not guarantee exactly-once delivery.
 */

export interface SyncResult {
  processed: boolean;
  reason?: string;
}

export async function syncChargeSucceeded(providerTransactionRef: string): Promise<SyncResult> {
  const payment = await prisma.payment.findFirst({ where: { providerTransactionRef } });
  if (!payment) {
    return { processed: false, reason: "No matching Payment for this reference" };
  }
  if (payment.status === "SUCCEEDED") {
    return { processed: false, reason: "Already SUCCEEDED (duplicate delivery)" };
  }

  await prisma.payment.update({ where: { id: payment.id }, data: { status: "SUCCEEDED" } });
  return { processed: true };
}

export async function syncChargeFailed(
  providerTransactionRef: string,
  failureReason?: string,
): Promise<SyncResult> {
  const payment = await prisma.payment.findFirst({ where: { providerTransactionRef } });
  if (!payment) {
    return { processed: false, reason: "No matching Payment for this reference" };
  }
  if (payment.status === "FAILED") {
    return { processed: false, reason: "Already FAILED (duplicate delivery)" };
  }

  const cancelledBooking: { id: string; listingId: string } | null = await prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: payment.id },
      data: { status: "FAILED", failureReason: failureReason ?? payment.failureReason },
    });

    // A failed CHARGE or SECURITY_DEPOSIT_HOLD that was standing in for a CONFIRMED
    // booking means the booking is no longer actually paid for — cancel it and
    // release the dates, same as a host-initiated cancellation.
    if (payment.type !== "CHARGE" && payment.type !== "SECURITY_DEPOSIT_HOLD") return null;

    const booking = await tx.booking.findUnique({ where: { id: payment.bookingId } });
    if (!booking || booking.status !== "CONFIRMED") return null;
    if (!canTransition(booking.status, "CANCELLED_BY_HOST", booking.rentalType)) return null;

    if (booking.rentalType === "SHORT_TERM") {
      await tx.availability.deleteMany({ where: { bookingId: booking.id } });
    }

    await tx.booking.update({
      where: { id: booking.id },
      data: {
        status: "CANCELLED_BY_HOST",
        cancelledAt: new Date(),
        cancellationReason: `Payment failed: ${failureReason ?? "unknown reason"}`,
      },
    });
    return { id: booking.id, listingId: booking.listingId };
  });

  if (payment.payerUserId) {
    await notify(payment.payerUserId, "PAYMENT_FAILED", {
      paymentId: payment.id,
      bookingId: payment.bookingId,
      amount: payment.amount,
      currency: payment.currency,
      failureReason,
    });

    if (cancelledBooking) {
      const listing = await prisma.listing.findUnique({ where: { id: cancelledBooking.listingId }, select: { title: true } });
      await notify(payment.payerUserId, "BOOKING_CANCELLED", {
        bookingId: cancelledBooking.id,
        listingTitle: listing?.title ?? "your listing",
        cancelledBy: "SYSTEM",
        reason: `Payment failed: ${failureReason ?? "unknown reason"}`,
      });
    }
  }

  return { processed: true };
}

export async function syncRefundSucceeded(providerTransactionRef: string): Promise<SyncResult> {
  const payment = await prisma.payment.findFirst({ where: { providerTransactionRef } });
  if (!payment) {
    // Not necessarily a bug — a refund issued manually from the Stripe dashboard
    // (outside our system) has no corresponding Payment row to update.
    return { processed: false, reason: "No matching Payment for this reference" };
  }
  if (payment.status === "SUCCEEDED") {
    return { processed: false, reason: "Already SUCCEEDED (duplicate delivery)" };
  }

  await prisma.payment.update({ where: { id: payment.id }, data: { status: "SUCCEEDED" } });
  return { processed: true };
}

export async function syncChargeback(
  originalProviderTransactionRef: string,
  disputeRef: string,
  amountCents: number,
): Promise<SyncResult> {
  const originalPayment = await prisma.payment.findFirst({
    where: { providerTransactionRef: originalProviderTransactionRef },
  });
  if (!originalPayment) {
    return { processed: false, reason: "No matching original Payment for this dispute" };
  }

  const existingChargeback = await prisma.payment.findFirst({
    where: { providerTransactionRef: disputeRef, type: "CHARGEBACK" },
  });
  if (existingChargeback) {
    return { processed: false, reason: "Chargeback already recorded (duplicate delivery)" };
  }

  await prisma.$transaction(async (tx) => {
    await tx.payment.create({
      data: {
        bookingId: originalPayment.bookingId,
        payerUserId: originalPayment.payeeUserId,
        payeeUserId: originalPayment.payerUserId,
        relatedPaymentId: originalPayment.id,
        type: "CHARGEBACK",
        amount: amountCents,
        currency: originalPayment.currency,
        provider: originalPayment.provider,
        providerTransactionRef: disputeRef,
        status: "PENDING",
      },
    });

    const booking = await tx.booking.findUnique({ where: { id: originalPayment.bookingId } });
    if (!booking) return;
    if (!canTransition(booking.status, "DISPUTED", booking.rentalType)) return;

    await tx.booking.update({ where: { id: booking.id }, data: { status: "DISPUTED" } });
  });

  return { processed: true };
}
