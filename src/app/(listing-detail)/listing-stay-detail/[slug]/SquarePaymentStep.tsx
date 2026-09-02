"use client";

import { useEffect, useRef, useState } from "react";
import ButtonPrimary from "@/components/ui/ButtonPrimary";
import { confirmSquarePayment } from "@/modules/payments/square-checkout";
import {
  getSquareApplicationId,
  getSquareClientLocationId,
  getSquareEnvironment,
} from "@/lib/payments/client-config";

// Square's Web Payments SDK has no official npm types package for its
// browser global — it's loaded via a plain <script> tag, not a bundled
// import (see loadSquareSdk below). This declares only the small slice of
// its shape this component actually touches.
declare global {
  interface Window {
    Square?: {
      payments(applicationId: string, locationId: string): SquarePayments;
    };
  }
}
interface SquarePayments {
  card(): Promise<SquareCard>;
}
interface SquareCard {
  attach(selector: string): Promise<void>;
  tokenize(): Promise<{ status: string; token?: string; errors?: { message: string }[] }>;
  destroy(): Promise<void>;
}

let sdkLoadPromise: Promise<void> | null = null;

function loadSquareSdk(): Promise<void> {
  if (window.Square) return Promise.resolve();
  if (sdkLoadPromise) return sdkLoadPromise;

  sdkLoadPromise = new Promise((resolve, reject) => {
    const src =
      getSquareEnvironment() === "production"
        ? "https://web.squarecdn.com/v1/square.js"
        : "https://sandbox.web.squarecdn.com/v1/square.js";
    const script = document.createElement("script");
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load the Square payment form. Please try again."));
    document.head.appendChild(script);
  });
  return sdkLoadPromise;
}

/**
 * Square's counterpart to the old StripePaymentStep.tsx. Unlike Stripe's
 * <PaymentElement> (which needs an <Elements> ancestor wired to a
 * clientSecret), Square's Card element attaches directly to a DOM node this
 * component owns — no provider wrapper needed, which is why BookingWidget.tsx
 * no longer wraps this in anything.
 */
export default function SquarePaymentStep({
  paymentIntentId,
  onConfirmed,
  buttonLabel,
}: {
  paymentIntentId: string;
  onConfirmed: (paymentIntentId: string) => void;
  buttonLabel: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<SquareCard | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    loadSquareSdk()
      .then(async () => {
        if (cancelled || !window.Square || !containerRef.current) return;
        const payments = window.Square.payments(getSquareApplicationId(), getSquareClientLocationId());
        const card = await payments.card();
        await card.attach("#square-card-container");
        if (cancelled) {
          await card.destroy();
          return;
        }
        cardRef.current = card;
        setIsReady(true);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load the payment form.");
      });

    return () => {
      cancelled = true;
      cardRef.current?.destroy();
      cardRef.current = null;
    };
    // paymentIntentId changing means a fresh quote/amount — remount the
    // card element for a clean slate rather than reusing a stale one.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentIntentId]);

  async function handlePay() {
    if (!cardRef.current) return;
    setError(null);
    setIsPending(true);

    const tokenizeResult = await cardRef.current.tokenize();
    if (tokenizeResult.status !== "OK" || !tokenizeResult.token) {
      setError(tokenizeResult.errors?.[0]?.message ?? "Payment failed. Please try a different card.");
      setIsPending(false);
      return;
    }

    const result = await confirmSquarePayment(paymentIntentId, tokenizeResult.token);
    if (!result.success) {
      setError(result.error.message);
      setIsPending(false);
      return;
    }
    if (result.data.status === "SUCCEEDED") {
      // No setIsPending(false) here on purpose — the parent takes over
      // (creating the booking) and replaces this UI once that resolves.
      onConfirmed(paymentIntentId);
      return;
    }

    setError(result.data.failureReason ?? "Payment did not complete. Please try again.");
    setIsPending(false);
  }

  return (
    <div className="space-y-4">
      <div
        id="square-card-container"
        ref={containerRef}
        className="min-h-[56px] rounded-lg border border-neutral-300 dark:border-neutral-600 px-3 py-2"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <ButtonPrimary disabled={!isReady || isPending} loading={isPending} onClick={handlePay}>
        {buttonLabel}
      </ButtonPrimary>
    </div>
  );
}
