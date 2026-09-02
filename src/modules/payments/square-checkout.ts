"use server";

import { randomUUID } from "crypto";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import type { ActionResult } from "@/lib/validations/auth";
import { createSquareClient, getSquareLocationId } from "@/lib/payments/square-client";

function fail<T>(message: string): ActionResult<T> {
  return { success: false, error: { code: "VALIDATION_ERROR", message } };
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
      const failureReason = response.errors?.[0]?.detail ?? "Payment was not approved";
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
    const failureReason = err instanceof Error ? err.message : "Payment failed";
    await prisma.pendingPaymentIntent
      .update({ where: { id: paymentIntentId }, data: { status: "FAILED", failureReason } })
      .catch(() => {});
    return { success: true, data: { status: "FAILED", failureReason } };
  }
}
