import { StubPaymentProvider } from "./stub-provider";
import { SquarePaymentProvider } from "./square-provider";
import { createSquareClient } from "./square-client";

export type {
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
import type { PaymentProvider } from "./provider";

let cachedProvider: PaymentProvider | null = null;

/**
 * The single place call sites obtain a PaymentProvider (ADR-006) — no
 * module outside src/lib/payments/ should import StubPaymentProvider or
 * SquarePaymentProvider directly.
 *
 * Feature-flagged via `PAYMENTS_PROVIDER` (defaults to "stub" so the app
 * runs fully offline with no Square credentials at all): set it to
 * "square" plus SQUARE_ACCESS_TOKEN/SQUARE_LOCATION_ID/
 * SQUARE_WEBHOOK_SIGNATURE_KEY once real credentials exist, and every
 * booking/payment code path starts exercising real Square with no other
 * code change.
 */
export function getPaymentProvider(): PaymentProvider {
  if (cachedProvider) return cachedProvider;

  const mode = process.env.PAYMENTS_PROVIDER ?? "stub";

  if (mode === "square") {
    const webhookSignatureKey = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
    if (!webhookSignatureKey) {
      throw new Error(
        'PAYMENTS_PROVIDER=square requires SQUARE_WEBHOOK_SIGNATURE_KEY to be set (SQUARE_ACCESS_TOKEN and SQUARE_LOCATION_ID are read directly by square-client.ts).',
      );
    }
    cachedProvider = new SquarePaymentProvider(createSquareClient(), webhookSignatureKey);
  } else if (mode === "stub") {
    cachedProvider = new StubPaymentProvider();
  } else {
    throw new Error(`Unknown PAYMENTS_PROVIDER "${mode}", expected "stub" or "square".`);
  }

  return cachedProvider;
}
