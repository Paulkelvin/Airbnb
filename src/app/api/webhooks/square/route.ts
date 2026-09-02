import { NextRequest, NextResponse } from "next/server";
import { handlePaymentWebhook } from "@/modules/payments/webhook-handler";

/**
 * Must read the raw request body — Square's signature is computed over the
 * exact notification URL + request body bytes, so parsing to JSON first
 * (which re-serializes) would break verification.
 */
export async function POST(request: NextRequest) {
  const signature = request.headers.get("x-square-hmacsha256-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing x-square-hmacsha256-signature header" }, { status: 400 });
  }

  const payload = await request.text();
  const result = await handlePaymentWebhook(payload, signature);

  if (!result.ok) {
    return NextResponse.json({ error: result.reason ?? "Webhook rejected" }, { status: 400 });
  }

  return NextResponse.json({ received: true, note: result.reason });
}
