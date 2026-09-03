import { randomUUID } from "crypto";
import { SquareClient, SquareError, WebhooksHelper } from "square";
import { prisma } from "@/lib/db";
import { getSiteUrl } from "@/lib/site-url";
import type {
  ChargeResult,
  NormalizedPaymentEvent,
  NormalizedPaymentMetadata,
  PayeeAccountStatus,
  PaymentIntentResult,
  PaymentProvider,
  PayoutResult,
  RefundResult,
  VerifiedChargeResult,
} from "./provider";
import { getSquareLocationId } from "./square-client";

/** The fixed webhook endpoint this app exposes — must exactly match the
 * notification URL registered for the webhook subscription in the Square
 * Developer Dashboard, since Square's signature is computed over
 * `notificationUrl + requestBody`, not the body alone. */
function webhookNotificationUrl(): string {
  return `${getSiteUrl()}/api/webhooks/square`;
}

/**
 * Real Square adapter (ADR-006/ADR-012). This is a single-merchant site —
 * there is one host (the site owner) and one Square account, not a
 * marketplace of independently-onboarded hosts — so the Connect-style
 * sub-account methods (createPayeeAccount/createOnboardingLink/
 * getAccountStatus/payout) don't move real money between accounts the way
 * the old Stripe Connect Express adapter did. They're kept as simplified,
 * always-ready implementations purely so the existing host-payout ledger
 * bookkeeping in modules/bookings/actions.ts (which creates a PAYOUT
 * Payment row after calling payout()) keeps working unchanged: money a
 * guest pays already lands directly in the site owner's own Square
 * balance, so a "payout" is just a ledger entry, not a real transfer.
 *
 * createCharge still stands in with a fixed Square sandbox test card nonce
 * for the off-session flows where no guest is present to tokenize a real
 * card in the moment (host-approval charging, security deposit holds, the
 * recurring monthly-rent job) — same limitation the old Stripe adapter had
 * with its hardcoded `pm_card_visa`. This only works against
 * SQUARE_ENVIRONMENT=sandbox; charging a real card off-session in
 * production needs Square's Card on File (Customers API + a stored card),
 * which is a separate, larger piece of work not built yet.
 *
 * createPaymentIntent/verifyPaymentIntent bridge Square's tokenize-then-
 * charge checkout flow onto the create/verify shape the rest of the app is
 * built against — see the PendingPaymentIntent model's comment in
 * prisma/schema.prisma and src/modules/payments/square-checkout.ts (the
 * bridging server action the checkout UI actually calls once it has a real
 * card token) for the full picture. createPaymentIntent itself never talks
 * to Square — there's nothing to create there yet, only a placeholder row
 * to track.
 */
export class SquarePaymentProvider implements PaymentProvider {
  constructor(
    private readonly client: SquareClient,
    private readonly webhookSignatureKey: string,
  ) {}

  async createCharge(
    amountCents: number,
    currency: string,
    payerRef: string,
    metadata: NormalizedPaymentMetadata,
  ): Promise<ChargeResult> {
    if (amountCents <= 0) {
      return { providerTransactionRef: "", status: "FAILED", failureReason: "Invalid amount" };
    }

    try {
      const response = await this.client.payments.create({
        sourceId: "cnon:card-nonce-ok",
        idempotencyKey: randomUUID(),
        amountMoney: { amount: BigInt(amountCents), currency: currency.toUpperCase() as never },
        locationId: getSquareLocationId(),
        note: `Booking ${metadata.bookingId} (${metadata.paymentType}) - payer ${payerRef}`,
        referenceId: metadata.bookingId,
      });
      return paymentToChargeResult(response.payment, response.errors);
    } catch (err) {
      return chargeFailureResult(err);
    }
  }

  async createPaymentIntent(
    amountCents: number,
    currency: string,
    payerUserId: string,
  ): Promise<PaymentIntentResult> {
    const pending = await prisma.pendingPaymentIntent.create({
      data: {
        provider: "SQUARE",
        payerUserId,
        amount: amountCents,
        currency: currency.toUpperCase(),
        status: "PENDING",
      },
    });
    // No real "clientSecret" concept in Square's checkout model (the
    // browser tokenizes a card via the Web Payments SDK using the public
    // Application/Location IDs, not a per-payment secret) — the pending
    // row's own id doubles as both paymentIntentId and clientSecret so the
    // interface stays satisfied without inventing meaning Square doesn't
    // have. See SquarePaymentStep.tsx for what the client actually does
    // with paymentIntentId.
    return { paymentIntentId: pending.id, clientSecret: pending.id };
  }

  async verifyPaymentIntent(paymentIntentId: string): Promise<VerifiedChargeResult> {
    const pending = await prisma.pendingPaymentIntent.findUnique({
      where: { id: paymentIntentId },
    });
    if (!pending) {
      return {
        providerTransactionRef: "",
        status: "FAILED",
        amountCents: 0,
        failureReason: "Unknown payment intent",
      };
    }
    return {
      providerTransactionRef: pending.providerTransactionRef ?? "",
      status: pending.status === "SUCCEEDED" ? "SUCCEEDED" : pending.status === "PENDING" ? "PENDING" : "FAILED",
      amountCents: pending.amount,
      payerUserId: pending.payerUserId,
    };
  }

  async refund(providerTransactionRef: string, amountCents?: number): Promise<RefundResult> {
    try {
      let refundAmountCents = amountCents;
      let currency = "USD";
      if (refundAmountCents === undefined) {
        const { payment } = await this.client.payments.get({ paymentId: providerTransactionRef });
        if (!payment?.amountMoney?.amount) {
          return { providerTransactionRef: "", status: "FAILED", failureReason: "Original payment not found" };
        }
        refundAmountCents = Number(payment.amountMoney.amount);
        currency = payment.amountMoney.currency ?? "USD";
      }

      const response = await this.client.refunds.refundPayment({
        idempotencyKey: randomUUID(),
        paymentId: providerTransactionRef,
        amountMoney: { amount: BigInt(refundAmountCents), currency: currency as never },
      });
      if (response.errors?.length || !response.refund) {
        const reason = response.errors?.[0]?.detail ?? "Refund failed";
        console.error(`Square refund rejected for payment ${providerTransactionRef}: ${reason}`);
        return {
          providerTransactionRef: "",
          status: "FAILED",
          failureReason: reason,
        };
      }
      return {
        providerTransactionRef: response.refund.id,
        status: mapRefundStatus(response.refund.status),
      };
    } catch (err) {
      console.error(`Square refund failed for payment ${providerTransactionRef}:`, err);
      return chargeFailureResult(err);
    }
  }

  /** Single-merchant site (see class doc) — there's only ever one Square
   * account, so "creating a payee account" just returns a fixed sentinel
   * ref rather than calling Square at all. */
  async createPayeeAccount(_user: { id: string; email: string }): Promise<string> {
    return "square-direct-account";
  }

  /** No separate onboarding to do (see class doc) — sends the host
   * straight back to the return URL as already "onboarded". */
  async createOnboardingLink(_payoutAccountRef: string, _refreshUrl: string, returnUrl: string): Promise<string> {
    return returnUrl;
  }

  async getAccountStatus(_payoutAccountRef: string): Promise<PayeeAccountStatus> {
    return { chargesEnabled: true, payoutsEnabled: true, detailsSubmitted: true };
  }

  /** No real transfer needed — a guest's payment already lands directly in
   * the site owner's own Square balance (see class doc), so this only
   * exists to give the caller a success result to record as a ledger
   * entry. */
  async payout(_payoutAccountRef: string, amountCents: number, _currency: string): Promise<PayoutResult> {
    if (amountCents <= 0) {
      return { providerTransactionRef: "", status: "FAILED", failureReason: "Invalid amount" };
    }
    return { providerTransactionRef: `square_payout_${randomUUID()}`, status: "SUCCEEDED" };
  }

  async verifyWebhookSignature(payload: string, signature: string): Promise<boolean> {
    try {
      return await WebhooksHelper.verifySignature({
        requestBody: payload,
        signatureHeader: signature,
        signatureKey: this.webhookSignatureKey,
        notificationUrl: webhookNotificationUrl(),
      });
    } catch (err) {
      console.error("Square webhook signature verification failed:", err);
      return false;
    }
  }

  /** Assumes verifyWebhookSignature already ran — parses the already-trusted payload only. */
  parseWebhookEvent(payload: string): NormalizedPaymentEvent {
    const event = JSON.parse(payload) as SquareWebhookEvent;

    switch (event.type) {
      case "payment.updated": {
        const payment = event.data?.object?.payment;
        if (!payment) return unhandled(event);
        if (payment.status === "COMPLETED" || payment.status === "APPROVED") {
          return {
            kind: "charge_succeeded",
            providerEventId: event.event_id,
            providerTransactionRef: payment.id,
            amountCents: Number(payment.amount_money?.amount ?? 0),
          };
        }
        if (payment.status === "FAILED" || payment.status === "CANCELED") {
          return {
            kind: "charge_failed",
            providerEventId: event.event_id,
            providerTransactionRef: payment.id,
            amountCents: Number(payment.amount_money?.amount ?? 0),
          };
        }
        return unhandled(event);
      }
      case "refund.updated": {
        const refund = event.data?.object?.refund;
        if (!refund) return unhandled(event);
        if (refund.status === "COMPLETED") {
          return {
            kind: "refund_succeeded",
            providerEventId: event.event_id,
            providerTransactionRef: refund.id,
            amountCents: Number(refund.amount_money?.amount ?? 0),
          };
        }
        return unhandled(event);
      }
      case "dispute.created": {
        const dispute = event.data?.object?.dispute;
        if (!dispute) return unhandled(event);
        return {
          kind: "chargeback_created",
          providerEventId: event.event_id,
          providerTransactionRef: dispute.disputed_payment_id ?? "",
          disputeRef: dispute.dispute_id,
          amountCents: Number(dispute.amount_money?.amount ?? 0),
        };
      }
      default:
        return unhandled(event);
    }
  }
}

/** Minimal shape of the fields this adapter actually reads from a Square
 * webhook notification body — Square's webhook payloads aren't covered by
 * the main SDK's response types, only the REST JSON shape documented at
 * developer.squareup.com/docs/webhooks. */
interface SquareWebhookEvent {
  event_id: string;
  type: string;
  data?: {
    object?: {
      payment?: { id: string; status?: string; amount_money?: { amount?: number } };
      refund?: { id: string; status?: string; amount_money?: { amount?: number } };
      dispute?: { dispute_id: string; disputed_payment_id?: string; amount_money?: { amount?: number } };
    };
  };
}

function unhandled(event: SquareWebhookEvent): NormalizedPaymentEvent {
  return { kind: "unhandled", providerEventId: event.event_id, providerEventType: event.type };
}

function paymentToChargeResult(
  payment: { id?: string; status?: string } | undefined,
  errors: { detail?: string }[] | undefined,
): ChargeResult {
  if (!payment?.id || errors?.length) {
    return { providerTransactionRef: "", status: "FAILED", failureReason: errors?.[0]?.detail ?? "Payment failed" };
  }
  return { providerTransactionRef: payment.id, status: mapPaymentStatus(payment.status) };
}

function mapPaymentStatus(status: string | undefined): ChargeResult["status"] {
  switch (status) {
    case "COMPLETED":
    case "APPROVED":
      return "SUCCEEDED";
    case "PENDING":
      return "PENDING";
    default:
      return "FAILED";
  }
}

function mapRefundStatus(status: string | null | undefined): RefundResult["status"] {
  switch (status) {
    case "COMPLETED":
      return "SUCCEEDED";
    case "PENDING":
      return "PENDING";
    default:
      return "FAILED";
  }
}

/** Card declines and other request-level failures become a FAILED result,
 * not a thrown error — a declined card is an expected business outcome,
 * not a system fault. Anything else (auth, connection, rate limit) propagates. */
function chargeFailureResult(err: unknown): { providerTransactionRef: ""; status: "FAILED"; failureReason: string } {
  if (err instanceof SquareError) {
    // err.message on a thrown SquareError is a raw "Status code: 400 Body:
    // {...}" API dump — not something a guest or host should ever see.
    // Square's own `detail` field on the first reported error is already a
    // real English sentence (e.g. "Payment could not be refunded."), so
    // prefer that; only fall back to the raw message if a future error
    // shape somehow omits it.
    const failureReason = err.errors?.[0]?.detail ?? err.message;
    return { providerTransactionRef: "", status: "FAILED", failureReason };
  }
  throw err;
}
