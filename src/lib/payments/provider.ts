/**
 * Gateway-agnostic payment interface (Platform Architecture Blueprint §5,
 * ADR-006). Booking/payment business logic calls only this interface —
 * never a gateway SDK directly. Amounts are always integer minor units
 * (cents); `Payment.amount` in the schema is the only monetary field with
 * this exact type, matching Stripe's own API convention.
 */

export interface NormalizedPaymentMetadata {
  bookingId: string;
  payerUserId: string;
  payeeUserId?: string;
  type: "CHARGE" | "REFUND" | "PAYOUT" | "SECURITY_DEPOSIT_HOLD" | "SECURITY_DEPOSIT_RELEASE";
}

export interface ChargeResult {
  providerTransactionRef: string;
  status: "SUCCEEDED" | "PENDING" | "FAILED";
  failureReason?: string;
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

export interface NormalizedPaymentEvent {
  providerTransactionRef: string;
  type: "charge.succeeded" | "charge.failed" | "refund.succeeded" | "chargeback.created";
  amountCents: number;
}

export interface PaymentProvider {
  createCharge(
    amountCents: number,
    currency: string,
    payerRef: string,
    metadata: NormalizedPaymentMetadata,
  ): Promise<ChargeResult>;

  refund(providerTransactionRef: string, amountCents?: number): Promise<RefundResult>;

  /** Host payout-account onboarding — returns an opaque ref stored on User.payoutAccountRef. */
  createPayeeAccount(user: { id: string; email: string }): Promise<string>;

  payout(payoutAccountRef: string, amountCents: number, currency: string): Promise<PayoutResult>;

  verifyWebhookSignature(payload: string, signature: string): boolean;

  parseWebhookEvent(payload: string): NormalizedPaymentEvent;
}
