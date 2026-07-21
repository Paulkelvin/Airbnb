import Stripe from "stripe";
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

/**
 * Real Stripe Connect (Express) adapter, built against the "separate
 * charges and transfers" model (ADR-005): guest charges land in the
 * platform's own Stripe balance via a PaymentIntent; a host's share moves
 * out later via an explicit Transfer (payout()), never a destination charge.
 *
 * Constructed with an injected `Stripe` client (dependency injection) so
 * the whole adapter can be exercised against a mocked client in tests
 * without real credentials or network access — no call site outside
 * src/lib/payments/ constructs a `Stripe` client directly.
 *
 * `createCharge` still stands in with a fixed Stripe test PaymentMethod
 * (`pm_card_visa`) for the off-session flows where no guest is present to
 * confirm a card in the moment — host-approval charging on a "Request to
 * book" listing, security deposit holds, and the recurring monthly-rent
 * job (src/jobs/booking-lifecycle.ts). Those need a saved payment method
 * (Stripe Customer + SetupIntent) to charge for real, which is a separate,
 * larger piece of work not built yet.
 *
 * `createPaymentIntent`/`verifyPaymentIntent` are the real-time, guest-present
 * counterpart: the guest confirms their own card client-side via Stripe
 * Elements at instant-book creation, and the server only ever re-verifies
 * that confirmation — it never sees or stores card data itself (PCI scope
 * stays minimal per the Platform Architecture Blueprint's hosted-card-UI rule).
 */
export class StripeConnectProvider implements PaymentProvider {
  constructor(
    private readonly stripe: Stripe,
    private readonly webhookSecret: string,
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
      const intent = await this.stripe.paymentIntents.create({
        amount: amountCents,
        currency: currency.toLowerCase(),
        payment_method: "pm_card_visa",
        payment_method_types: ["card"],
        confirm: true,
        description: `Booking ${metadata.bookingId} (${metadata.paymentType}) — payer ${payerRef}`,
        metadata: {
          bookingId: metadata.bookingId,
          payerUserId: metadata.payerUserId,
          payeeUserId: metadata.payeeUserId ?? "",
          paymentType: metadata.paymentType,
        },
      });
      return { providerTransactionRef: intent.id, status: mapIntentStatus(intent.status) };
    } catch (err) {
      return chargeFailureResult(err);
    }
  }

  async createPaymentIntent(
    amountCents: number,
    currency: string,
    payerUserId: string,
  ): Promise<PaymentIntentResult> {
    const intent = await this.stripe.paymentIntents.create({
      amount: amountCents,
      currency: currency.toLowerCase(),
      // Cards only, matching createCharge — other payment methods Stripe
      // could offer (bank debits, some wallets) settle asynchronously
      // ("processing" rather than an immediate result), which this
      // synchronous confirm-then-book flow isn't built to wait out.
      payment_method_types: ["card"],
      description: `Instant-book charge — payer ${payerUserId}`,
      metadata: { payerUserId },
    });
    if (!intent.client_secret) {
      throw new Error("Stripe did not return a client_secret for the new PaymentIntent");
    }
    return { paymentIntentId: intent.id, clientSecret: intent.client_secret };
  }

  async verifyPaymentIntent(paymentIntentId: string): Promise<VerifiedChargeResult> {
    const intent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
    return {
      providerTransactionRef: intent.id,
      status: mapIntentStatus(intent.status),
      amountCents: intent.amount,
      payerUserId: (intent.metadata?.payerUserId as string) || undefined,
    };
  }

  async refund(providerTransactionRef: string, amountCents?: number): Promise<RefundResult> {
    try {
      const refund = await this.stripe.refunds.create({
        payment_intent: providerTransactionRef,
        amount: amountCents,
      });
      return { providerTransactionRef: refund.id, status: mapRefundStatus(refund.status) };
    } catch (err) {
      return chargeFailureResult(err);
    }
  }

  async createPayeeAccount(user: { id: string; email: string }): Promise<string> {
    const account = await this.stripe.accounts.create({
      type: "express",
      email: user.email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      metadata: { internalUserId: user.id },
    });
    return account.id;
  }

  async createOnboardingLink(
    payoutAccountRef: string,
    refreshUrl: string,
    returnUrl: string,
  ): Promise<string> {
    const link = await this.stripe.accountLinks.create({
      account: payoutAccountRef,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: "account_onboarding",
    });
    return link.url;
  }

  async getAccountStatus(payoutAccountRef: string): Promise<PayeeAccountStatus> {
    const account = await this.stripe.accounts.retrieve(payoutAccountRef);
    return {
      chargesEnabled: account.charges_enabled ?? false,
      payoutsEnabled: account.payouts_enabled ?? false,
      detailsSubmitted: account.details_submitted ?? false,
    };
  }

  async payout(
    payoutAccountRef: string,
    amountCents: number,
    currency: string,
  ): Promise<PayoutResult> {
    if (amountCents <= 0) {
      return { providerTransactionRef: "", status: "FAILED", failureReason: "Invalid amount" };
    }
    try {
      const transfer = await this.stripe.transfers.create({
        amount: amountCents,
        currency: currency.toLowerCase(),
        destination: payoutAccountRef,
      });
      return { providerTransactionRef: transfer.id, status: "SUCCEEDED" };
    } catch (err) {
      return chargeFailureResult(err);
    }
  }

  verifyWebhookSignature(payload: string, signature: string): boolean {
    try {
      this.stripe.webhooks.constructEvent(payload, signature, this.webhookSecret);
      return true;
    } catch (err) {
      console.error("Stripe webhook signature verification failed:", err);
      return false;
    }
  }

  /** Assumes verifyWebhookSignature already ran — parses the already-trusted payload only. */
  parseWebhookEvent(payload: string): NormalizedPaymentEvent {
    const event = JSON.parse(payload) as Stripe.Event;

    switch (event.type) {
      case "payment_intent.succeeded": {
        const intent = event.data.object as Stripe.PaymentIntent;
        return {
          kind: "charge_succeeded",
          providerEventId: event.id,
          providerTransactionRef: intent.id,
          amountCents: intent.amount_received || intent.amount,
        };
      }
      case "payment_intent.payment_failed": {
        const intent = event.data.object as Stripe.PaymentIntent;
        return {
          kind: "charge_failed",
          providerEventId: event.id,
          providerTransactionRef: intent.id,
          amountCents: intent.amount,
          failureReason: intent.last_payment_error?.message,
        };
      }
      case "refund.updated": {
        const refund = event.data.object as Stripe.Refund;
        if (refund.status === "succeeded") {
          return {
            kind: "refund_succeeded",
            providerEventId: event.id,
            providerTransactionRef: refund.id,
            amountCents: refund.amount,
          };
        }
        return { kind: "unhandled", providerEventId: event.id, providerEventType: event.type };
      }
      case "charge.dispute.created": {
        const dispute = event.data.object as Stripe.Dispute;
        return {
          kind: "chargeback_created",
          providerEventId: event.id,
          providerTransactionRef:
            typeof dispute.payment_intent === "string"
              ? dispute.payment_intent
              : (dispute.payment_intent?.id ?? ""),
          disputeRef: dispute.id,
          amountCents: dispute.amount,
        };
      }
      case "account.updated": {
        const account = event.data.object as Stripe.Account;
        return {
          kind: "account_updated",
          providerEventId: event.id,
          payoutAccountRef: account.id,
          status: {
            chargesEnabled: account.charges_enabled ?? false,
            payoutsEnabled: account.payouts_enabled ?? false,
            detailsSubmitted: account.details_submitted ?? false,
          },
        };
      }
      default:
        return { kind: "unhandled", providerEventId: event.id, providerEventType: event.type };
    }
  }
}

function mapIntentStatus(status: Stripe.PaymentIntent.Status): ChargeResult["status"] {
  switch (status) {
    case "succeeded":
      return "SUCCEEDED";
    case "processing":
    case "requires_capture":
    case "requires_action":
    case "requires_confirmation":
      return "PENDING";
    default:
      return "FAILED";
  }
}

function mapRefundStatus(status: string | null | undefined): RefundResult["status"] {
  switch (status) {
    case "succeeded":
      return "SUCCEEDED";
    case "pending":
      return "PENDING";
    default:
      return "FAILED";
  }
}

/** Card declines and other request-level failures become a FAILED result, not a thrown error — a declined card is an expected business outcome, not a system fault. Auth/connection/rate-limit errors still propagate. */
function chargeFailureResult(err: unknown): { providerTransactionRef: ""; status: "FAILED"; failureReason: string } {
  if (
    err instanceof Stripe.errors.StripeCardError ||
    err instanceof Stripe.errors.StripeInvalidRequestError
  ) {
    return { providerTransactionRef: "", status: "FAILED", failureReason: err.message };
  }
  throw err;
}
