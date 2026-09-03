"use server";

import { randomUUID } from "crypto";
import { SquareError } from "square";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import type { ActionResult } from "@/lib/validations/auth";
import { createSquareClient, getSquareLocationId } from "@/lib/payments/square-client";

function fail<T>(message: string): ActionResult<T> {
  return { success: false, error: { code: "VALIDATION_ERROR", message } };
}

// Square's card-decline codes, mapped to plain-English messages a guest can
// actually act on. Anything not in this list falls back to a generic
// message — guests should never see a raw Square API error (error codes,
// "Status code: 400 Body: {...}" dumps, etc.), only developers reading logs
// should see those.
const DECLINE_MESSAGES: Record<string, string> = {
  CVV_FAILURE: "The security code (CVV) doesn't match your card. Please check it and try again.",
  ADDRESS_VERIFICATION_FAILURE:
    "The billing address or zip code doesn't match your card. Please check it and try again.",
  INSUFFICIENT_FUNDS: "Your card was declined for insufficient funds.",
  CARD_EXPIRED: "This card has expired. Please use a different card.",
  CARD_DECLINED: "Your card was declined. Please try a different card or contact your bank.",
  GENERIC_DECLINE: "Your card was declined. Please try a different card or contact your bank.",
  INVALID_EXPIRATION: "The expiration date entered doesn't match your card.",
  INVALID_CARD: "This card couldn't be processed. Please check the details or try a different card.",
  TRANSACTION_LIMIT: "This charge exceeds a limit on your card. Please contact your bank or try a different card.",
};
const GENERIC_DECLINE_MESSAGE = "We couldn't process your card. Please try a different card or contact your bank.";

function friendlyFailureReason(errorCode: string | undefined): string {
  if (errorCode && DECLINE_MESSAGES[errorCode]) return DECLINE_MESSAGES[errorCode];
  return GENERIC_DECLINE_MESSAGE;
}

/**
 * The Square-specific half of the checkout flow (ADR-006 deliberately
 * allows checkout UI + its direct bridging action to touch a gateway SDK —
 * see StripePaymentStep.tsx's precedent importing @stripe/react-stripe-js
 * directly; the *booking* business logic in modules/bookings/actions.ts
 * stays fully gateway-agnostic via PaymentProvider).
 *
 * Square's Web Payments SDK tokenizes the guest's card client-side into a
 * one-time-use `sourceId` (nonce) — that's as far as the browser can go on
 * its own; unlike Stripe, there's no gateway-hosted "confirm" step it can
 * complete directly. This action is that missing step: it takes the
 * server-created PendingPaymentIntent (see SquarePaymentProvider.
 * createPaymentIntent) plus the browser's nonce, actually calls Square to
 * charge the card, and records the outcome on that row so
 * SquarePaymentProvider.verifyPaymentIntent can read it back afterward —
 * exactly mirroring what a real Stripe PaymentIntent already "knows" once
 * the guest confirms it client-side.
 */
export async function confirmSquarePayment(
  paymentIntentId: string,
  sourceId: string,
): Promise<ActionResult<{ status: "SUCCEEDED" | "FAILED"; failureReason?: string }>> {
  const user = await requireAuth();

  const pending = await prisma.pendingPaymentIntent.findUnique({ where: { id: paymentIntentId } });
  if (!pending) return fail("This payment session was not found or has expired.");
  if (pending.payerUserId !== user.id) return fail("This payment session doesn't belong to you.");

  // Already resolved (e.g. the browser retried after a slow response that
  // actually succeeded) — report the existing outcome instead of charging
  // again.
  if (pending.status === "SUCCEEDED") {
    return { success: true, data: { status: "SUCCEEDED" } };
  }

  const client = createSquareClient();
  // A fresh idempotency key per real attempt (rather than reusing
  // paymentIntentId forever) so a guest whose card was declined can retry
  // with a different card under the same pending row — reusing the same
  // key would make Square just replay the earlier failed result. A bare
  // UUID (36 chars) rather than prefixing it with paymentIntentId — Square
  // caps idempotency_key at 45 characters, and two concatenated UUIDs blew
  // well past that.
  const idempotencyKey = randomUUID();

  try {
    const response = await client.payments.create({
      sourceId,
      idempotencyKey,
      amountMoney: { amount: BigInt(pending.amount), currency: pending.currency as never },
      locationId: getSquareLocationId(),
      referenceId: pending.id,
    });

    const payment = response.payment;
    const succeeded = payment?.id && (payment.status === "COMPLETED" || payment.status === "APPROVED");

    if (!succeeded) {
      const failureReason = friendlyFailureReason(response.errors?.[0]?.code);
      await prisma.pendingPaymentIntent.update({
        where: { id: paymentIntentId },
        data: { status: "FAILED", failureReason },
      });
      return { success: true, data: { status: "FAILED", failureReason } };
    }

    await prisma.pendingPaymentIntent.update({
      where: { id: paymentIntentId },
      data: { status: "SUCCEEDED", providerTransactionRef: payment.id },
    });
    return { success: true, data: { status: "SUCCEEDED" } };
  } catch (err) {
    // Square's SDK throws SquareError with the same {errors: [{code, ...}]}
    // shape as a non-throwing decline response — map it the same way rather
    // than surfacing err.message, which is a raw "Status code: 400 Body:
    // {...}" API dump, not something a guest should ever see.
    const failureReason =
      err instanceof SquareError
        ? friendlyFailureReason(err.errors?.[0]?.code)
        : GENERIC_DECLINE_MESSAGE;
    // eslint-disable-next-line no-console
    console.error("Square payment confirmation failed", err);
    await prisma.pendingPaymentIntent
      .update({ where: { id: paymentIntentId }, data: { status: "FAILED", failureReason } })
      .catch(() => {});
    return { success: true, data: { status: "FAILED", failureReason } };
  }
}
