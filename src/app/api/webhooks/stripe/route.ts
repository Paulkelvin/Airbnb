import { NextRequest, NextResponse } from "next/server";
import { handleStripeWebhook } from "@/modules/payments/webhook-handler";

/**
 * Must read the raw request body — Stripe's signature is computed over the
 * exact bytes sent, so parsing to JSON first (which re-serializes) would
 * break verification.
 */
export async function POST(request: NextRequest) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  const payload = await request.text();
  const result = await handleStripeWebhook(payload, signature);

  if (!result.ok) {
    return NextResponse.json({ error: result.reason ?? "Webhook rejected" }, { status: 400 });
  }

  return NextResponse.json({ received: true, note: result.reason });
}
