import Stripe from "stripe";
import type { PaymentProvider } from "./provider";
import { StubPaymentProvider } from "./stub-provider";
import { StripeConnectProvider } from "./stripe-provider";

export type {
  ChargeResult,
  NormalizedPaymentEvent,
  NormalizedPaymentMetadata,
  PayeeAccountStatus,
  PaymentProvider,
  PayoutResult,
  RefundResult,
} from "./provider";

let cachedProvider: PaymentProvider | null = null;

/**
 * The single place call sites obtain a PaymentProvider (ADR-006) — no
 * module outside src/lib/payments/ should import StubPaymentProvider or
 * StripeConnectProvider directly.
 *
 * Feature-flagged via `PAYMENTS_PROVIDER` (defaults to "stub" so the app
 * runs fully offline with no Stripe credentials at all): set it to
 * "stripe" plus `STRIPE_SECRET_KEY`/`STRIPE_WEBHOOK_SECRET` once real
 * test-mode credentials exist, and every booking/payment code path starts
 * exercising real Stripe Connect with no other code change.
 */
export function getPaymentProvider(): PaymentProvider {
  if (cachedProvider) return cachedProvider;

  const mode = process.env.PAYMENTS_PROVIDER ?? "stub";

  if (mode === "stripe") {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secretKey || !webhookSecret) {
      throw new Error(
        'PAYMENTS_PROVIDER=stripe requires both STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET to be set.',
      );
    }
    cachedProvider = new StripeConnectProvider(new Stripe(secretKey), webhookSecret);
  } else if (mode === "stub") {
    cachedProvider = new StubPaymentProvider();
  } else {
    throw new Error(`Unknown PAYMENTS_PROVIDER "${mode}" — expected "stub" or "stripe".`);
  }

  return cachedProvider;
}
