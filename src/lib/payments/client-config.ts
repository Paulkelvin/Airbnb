/**
 * Client-safe payment config — deliberately has no import of the server-only
 * "stripe" package (unlike src/lib/payments/index.ts), so client components
 * can import this without bundling the Stripe Node SDK.
 */

/** Whether a real Stripe publishable key is configured — gates whether the
 * booking widget renders the embedded Elements payment form at all
 * (Stripe.js can't initialize without one) versus falling back to the
 * existing dev/stub flow. */
export function isStripeCheckoutConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
}

export function getStripePublishableKey(): string {
  return process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";
}
