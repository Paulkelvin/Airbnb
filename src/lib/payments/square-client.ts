import { SquareClient, SquareEnvironment } from "square";

/**
 * Constructs the Square SDK client from env — the one place a raw Square
 * `SquareClient` gets created (ADR-006: gateway SDKs stay behind this
 * module). Used by both SquarePaymentProvider (the abstract PaymentProvider
 * adapter) and square-checkout.ts (the checkout-specific bridging action
 * that has to call Square directly — see that file for why).
 */
export function createSquareClient(): SquareClient {
  const token = process.env.SQUARE_ACCESS_TOKEN;
  if (!token) {
    throw new Error("SQUARE_ACCESS_TOKEN is not set");
  }
  const environment =
    process.env.SQUARE_ENVIRONMENT === "production"
      ? SquareEnvironment.Production
      : SquareEnvironment.Sandbox;
  return new SquareClient({ token, environment });
}

export function getSquareLocationId(): string {
  const locationId = process.env.SQUARE_LOCATION_ID;
  if (!locationId) {
    throw new Error("SQUARE_LOCATION_ID is not set");
  }
  return locationId;
}
