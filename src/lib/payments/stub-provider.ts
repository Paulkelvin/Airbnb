import crypto from "crypto";
import type {
  ChargeResult,
  NormalizedPaymentEvent,
  NormalizedPaymentMetadata,
  PayeeAccountStatus,
  PaymentProvider,
  PayoutResult,
  RefundResult,
} from "./provider";

/**
 * NOT FOR PRODUCTION. Deterministic fake PaymentProvider that always
 * succeeds and never calls a real gateway — lets the full booking engine
 * (charges, refunds, deposit holds/releases, payouts) be built and tested
 * end-to-end before real Stripe Connect credentials exist. Every
 * `providerTransactionRef` is prefixed `stub_` so it can never collide
 * with — or be mistaken for — a real Stripe reference.
 *
 * Selected automatically by src/lib/payments/index.ts whenever
 * PAYMENTS_PROVIDER isn't explicitly set to "stripe" — no call site outside
 * src/lib/payments/ should ever need to know which adapter is active.
 */
export class StubPaymentProvider implements PaymentProvider {
  async createCharge(
    amountCents: number,
    _currency: string,
    _payerRef: string,
    _metadata: NormalizedPaymentMetadata,
  ): Promise<ChargeResult> {
    if (amountCents <= 0) {
      return { providerTransactionRef: "", status: "FAILED", failureReason: "Invalid amount" };
    }
    return {
      providerTransactionRef: `stub_ch_${crypto.randomUUID()}`,
      status: "SUCCEEDED",
    };
  }

  async refund(providerTransactionRef: string, _amountCents?: number): Promise<RefundResult> {
    return {
      providerTransactionRef: `stub_re_${crypto.randomUUID()}`,
      status: "SUCCEEDED",
    };
  }

  async createPayeeAccount(user: { id: string; email: string }): Promise<string> {
    return `stub_acct_${user.id}`;
  }

  async createOnboardingLink(
    payoutAccountRef: string,
    _refreshUrl: string,
    _returnUrl: string,
  ): Promise<string> {
    return `https://stub-onboarding.example.com/${payoutAccountRef}`;
  }

  async getAccountStatus(_payoutAccountRef: string): Promise<PayeeAccountStatus> {
    return { chargesEnabled: true, payoutsEnabled: true, detailsSubmitted: true };
  }

  async payout(
    _payoutAccountRef: string,
    amountCents: number,
    _currency: string,
  ): Promise<PayoutResult> {
    if (amountCents <= 0) {
      return { providerTransactionRef: "", status: "FAILED", failureReason: "Invalid amount" };
    }
    return {
      providerTransactionRef: `stub_po_${crypto.randomUUID()}`,
      status: "SUCCEEDED",
    };
  }

  verifyWebhookSignature(_payload: string, _signature: string): boolean {
    return true;
  }

  parseWebhookEvent(payload: string): NormalizedPaymentEvent {
    return JSON.parse(payload);
  }
}
