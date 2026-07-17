"use client";

import { useState } from "react";
import { PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import ButtonPrimary from "@/components/ui/ButtonPrimary";

/**
 * Must render inside an <Elements> provider (useStripe/useElements only
 * work as descendants of it) — see ShortTermBookingForm in BookingWidget.tsx
 * for where this is mounted once a PaymentIntent clientSecret is ready.
 */
export default function StripePaymentStep({
  onConfirmed,
  buttonLabel,
}: {
  onConfirmed: (paymentIntentId: string) => void;
  buttonLabel: string;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePay() {
    if (!stripe || !elements) return;
    setError(null);
    setIsPending(true);

    const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
    });

    if (confirmError) {
      setError(confirmError.message ?? "Payment failed. Please try a different card.");
      setIsPending(false);
      return;
    }

    if (paymentIntent?.status === "succeeded") {
      // No setIsPending(false) here on purpose — the parent takes over
      // (creating the booking) and replaces this UI once that resolves.
      onConfirmed(paymentIntent.id);
      return;
    }

    setError("Payment did not complete. Please try again.");
    setIsPending(false);
  }

  return (
    <div className="space-y-4">
      <PaymentElement />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <ButtonPrimary disabled={!stripe || isPending} loading={isPending} onClick={handlePay}>
        {buttonLabel}
      </ButtonPrimary>
    </div>
  );
}
