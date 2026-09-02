/**
 * Client-safe payment config — deliberately has no import of the server-only
 * "square" package, so client components can import this without bundling
 * the Square Node SDK. Square's own browser SDK (Web Payments SDK) is
 * loaded separately via a <script> tag in SquarePaymentStep.tsx, not npm.
 */

/** Whether real Square checkout credentials are configured — gates whether
 * the booking widget renders the embedded card form at all versus falling
 * back to the existing dev/stub flow. */
export function isSquareCheckoutConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID && process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID,
  );
}

export function getSquareApplicationId(): string {
  return process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID ?? "";
}

export function getSquareClientLocationId(): string {
  return process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID ?? "";
}

/** Which Web Payments SDK script (and which of the app/location IDs above
 * are even valid) depends on sandbox vs production — same env var the
 * server-side square-client.ts reads, just exposed here for the browser. */
export function getSquareEnvironment(): "sandbox" | "production" {
  return process.env.NEXT_PUBLIC_SQUARE_ENVIRONMENT === "production" ? "production" : "sandbox";
}
