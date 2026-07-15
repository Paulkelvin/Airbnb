import { getPaymentProvider, type NormalizedPaymentEvent } from "@/lib/payments";
import {
  syncChargeSucceeded,
  syncChargeFailed,
  syncRefundSucceeded,
  syncChargeback,
} from "@/modules/bookings/payment-sync";
import { syncPayeeAccountStatus } from "./account-sync";

export interface WebhookProcessResult {
  /** True once the event has been durably handled (or correctly determined to need no action) — the route always responds 200 in that case, per webhook convention. */
  ok: boolean;
  reason?: string;
}

/**
 * Thin dispatcher (ADR-012): verifies + normalizes via the active
 * PaymentProvider, then hands the normalized event to whichever module
 * owns the affected data. Never touches Booking/Payment/User rows itself.
 */
export async function handleStripeWebhook(
  payload: string,
  signature: string,
): Promise<WebhookProcessResult> {
  const provider = getPaymentProvider();

  if (!provider.verifyWebhookSignature(payload, signature)) {
    return { ok: false, reason: "Invalid webhook signature" };
  }

  const event = provider.parseWebhookEvent(payload);
  return dispatch(event);
}

async function dispatch(event: NormalizedPaymentEvent): Promise<WebhookProcessResult> {
  switch (event.kind) {
    case "charge_succeeded": {
      const result = await syncChargeSucceeded(event.providerTransactionRef);
      return { ok: true, reason: result.reason };
    }
    case "charge_failed": {
      const result = await syncChargeFailed(event.providerTransactionRef, event.failureReason);
      return { ok: true, reason: result.reason };
    }
    case "refund_succeeded": {
      const result = await syncRefundSucceeded(event.providerTransactionRef);
      return { ok: true, reason: result.reason };
    }
    case "chargeback_created": {
      const result = await syncChargeback(
        event.providerTransactionRef,
        event.disputeRef,
        event.amountCents,
      );
      return { ok: true, reason: result.reason };
    }
    case "account_updated": {
      await syncPayeeAccountStatus(event.payoutAccountRef, event.status);
      return { ok: true };
    }
    case "unhandled":
      return { ok: true, reason: `Unhandled event type: ${event.providerEventType}` };
  }
}
