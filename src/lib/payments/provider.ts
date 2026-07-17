/**
 * Gateway-agnostic payment interface (Platform Architecture Blueprint §5,
 * Domain Model Specification §6, ADR-006). Booking/payment business logic
 * calls only this interface — never a gateway SDK directly. Amounts are
 * always integer minor units (cents); `Payment.amount` in the schema is the
 * only monetary field with this exact type, matching Stripe's own API
 * convention.
 *
 * `createOnboardingLink` and `getAccountStatus` are additions beyond the
 * six methods named in the spec — ADR-006 anticipated this ("a
 * gateway-specific capability with no equivalent elsewhere... forces an
 * interface extension"). Express onboarding is a two-step process (create
 * the account, then generate a Stripe-hosted onboarding link) and there is
 * no way to know whether a host has finished onboarding without an explicit
 * status check, so both are genuinely necessary, not speculative.
 */

export interface NormalizedPaymentMetadata {
  bookingId: string;
  payerUserId: string;
  payeeUserId?: string;
  paymentType: "CHARGE" | "REFUND" | "PAYOUT" | "SECURITY_DEPOSIT_HOLD" | "SECURITY_DEPOSIT_RELEASE";
}

export interface ChargeResult {
  providerTransactionRef: string;
  status: "SUCCEEDED" | "PENDING" | "FAILED";
  failureReason?: string;
}

export interface PaymentIntentResult {
  paymentIntentId: string;
  clientSecret: string;
}

/** Adds the actual charged amount so the caller can verify it against the
 * server-computed quote before trusting a client-supplied paymentIntentId —
 * never assume the intent that was confirmed client-side is for the amount
 * we expect. */
export interface VerifiedChargeResult extends ChargeResult {
  amountCents: number;
}

export interface RefundResult {
  providerTransactionRef: string;
  status: "SUCCEEDED" | "PENDING" | "FAILED";
  failureReason?: string;
}

export interface PayoutResult {
  providerTransactionRef: string;
  status: "SUCCEEDED" | "PENDING" | "FAILED";
  failureReason?: string;
}

export interface PayeeAccountStatus {
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
}

interface NormalizedEventBase {
  /** The provider's own event id — for logging/tracing, not the idempotency key itself (see Domain Model Spec §2.14: idempotency is Payment-row-status-based, not event-log-based). */
  providerEventId: string;
}

export type NormalizedPaymentEvent =
  | (NormalizedEventBase & {
      kind: "charge_succeeded";
      providerTransactionRef: string;
      amountCents: number;
    })
  | (NormalizedEventBase & {
      kind: "charge_failed";
      providerTransactionRef: string;
      amountCents: number;
      failureReason?: string;
    })
  | (NormalizedEventBase & {
      kind: "refund_succeeded";
      providerTransactionRef: string;
      amountCents: number;
    })
  | (NormalizedEventBase & {
      kind: "chargeback_created";
      /** The ref of the original charge being disputed. */
      providerTransactionRef: string;
      /** The dispute's own ref — becomes the CHARGEBACK Payment row's providerTransactionRef. */
      disputeRef: string;
      amountCents: number;
    })
  | (NormalizedEventBase & {
      kind: "account_updated";
      payoutAccountRef: string;
      status: PayeeAccountStatus;
    })
  /** Any provider event we receive but don't act on — the webhook route still acknowledges it (200), just does nothing. */
  | (NormalizedEventBase & {
      kind: "unhandled";
      providerEventType: string;
    });

export interface PaymentProvider {
  createCharge(
    amountCents: number,
    currency: string,
    payerRef: string,
    metadata: NormalizedPaymentMetadata,
  ): Promise<ChargeResult>;

  /**
   * Real-time, guest-present flow only (embedded Stripe Elements at
   * instant-book creation): creates an unconfirmed PaymentIntent for the
   * guest's browser to confirm with their own card via Stripe.js. Never
   * hardcodes a payment method — that's the whole point over createCharge's
   * existing test-card stand-in. No bookingId parameter — this is called
   * before a booking row exists (the guest confirms payment before
   * createShortTermBooking runs); the eventual Payment row's
   * providerTransactionRef is what actually links it back to a booking.
   */
  createPaymentIntent(
    amountCents: number,
    currency: string,
    payerUserId: string,
  ): Promise<PaymentIntentResult>;

  /**
   * Server-side re-verification of a client-confirmed PaymentIntent —
   * never trust the client's claim that payment succeeded. Returns the
   * actual charged amount so the caller can reject a mismatch against the
   * server-computed quote.
   */
  verifyPaymentIntent(paymentIntentId: string): Promise<VerifiedChargeResult>;

  refund(providerTransactionRef: string, amountCents?: number): Promise<RefundResult>;

  /** Host payout-account onboarding — returns an opaque ref stored on User.payoutAccountRef. */
  createPayeeAccount(user: { id: string; email: string }): Promise<string>;

  /** Stripe-hosted onboarding URL the host is redirected to. Links expire/are single-use — call again to get a fresh one. */
  createOnboardingLink(
    payoutAccountRef: string,
    refreshUrl: string,
    returnUrl: string,
  ): Promise<string>;

  /** Live status check — never cached, since User.payoutAccountRef is deliberately the only payout-related field on User (ADR-007). */
  getAccountStatus(payoutAccountRef: string): Promise<PayeeAccountStatus>;

  payout(payoutAccountRef: string, amountCents: number, currency: string): Promise<PayoutResult>;

  verifyWebhookSignature(payload: string, signature: string): boolean;

  /** Assumes the caller already verified the signature — parses/normalizes only, per Domain Model Spec §6's exact interface shape. */
  parseWebhookEvent(payload: string): NormalizedPaymentEvent;
}
