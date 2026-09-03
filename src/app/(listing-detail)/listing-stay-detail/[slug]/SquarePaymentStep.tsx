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
    // Apple's own JS API (not Square's) — used only to decide whether to
    // show the Apple Pay button at all, before ever touching Square's SDK.
    ApplePaySession?: {
      canMakePayments(): boolean;
    };
  }
}
interface TokenizeResult {
  status: string;
  token?: string;
  errors?: { message: string }[];
}
interface SquarePayments {
  card(): Promise<SquareCard>;
  paymentRequest(options: {
    countryCode: string;
    currencyCode: string;
    total: { amount: string; label: string };
  }): SquarePaymentRequest;
  applePay(paymentRequest: SquarePaymentRequest): Promise<SquareApplePay>;
}
// Opaque handle passed straight from paymentRequest() to applePay() —
// nothing in this component reads its shape.
type SquarePaymentRequest = unknown;
interface SquareCard {
  attach(selector: string): Promise<void>;
  tokenize(): Promise<TokenizeResult>;
  destroy(): Promise<void>;
}
interface SquareApplePay {
  tokenize(): Promise<TokenizeResult>;
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
  amount,
  currency,
  onConfirmed,
  buttonLabel,
}: {
  paymentIntentId: string;
  /** Whole-currency-unit amount (e.g. dollars, not cents) — only used to build Apple Pay's on-sheet total. */
  amount: number;
  currency: string;
  onConfirmed: (paymentIntentId: string) => void;
  buttonLabel: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<SquareCard | null>(null);
  const applePayRef = useRef<SquareApplePay | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [applePayReady, setApplePayReady] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [isApplePayPending, setIsApplePayPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm(tokenizeResult: TokenizeResult): Promise<boolean> {
    if (tokenizeResult.status !== "OK" || !tokenizeResult.token) {
      setError(tokenizeResult.errors?.[0]?.message ?? "Payment failed. Please try a different card.");
      return false;
    }

    const result = await confirmSquarePayment(paymentIntentId, tokenizeResult.token);
    if (!result.success) {
      setError(result.error.message);
      return false;
    }
    if (result.data.status === "SUCCEEDED") {
      onConfirmed(paymentIntentId);
      return true;
    }

    setError(result.data.failureReason ?? "Payment did not complete. Please try again.");
    return false;
  }

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

        // Only attempt Apple Pay on a device/browser that actually supports
        // it (Safari) — Square's own applePay() call can succeed even where
        // the button would never be usable, so this is Apple's own gate,
        // checked first.
        if (!window.ApplePaySession?.canMakePayments()) return;
        try {
          const paymentRequest = payments.paymentRequest({
            countryCode: "US",
            currencyCode: currency,
            total: { amount: amount.toFixed(2), label: "Potomac Vista Cottage" },
          });
          const applePay = await payments.applePay(paymentRequest);
          if (cancelled) return;
          applePayRef.current = applePay;
          setApplePayReady(true);
        } catch {
          // Apple Pay is a nice-to-have, not the primary checkout path —
          // any setup failure here (e.g. domain not yet verified with
          // Square) just means the button doesn't render, silently, and
          // the card form above still works.
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load the payment form.");
      });

    return () => {
      cancelled = true;
      cardRef.current?.destroy();
      cardRef.current = null;
      applePayRef.current = null;
    };
    // paymentIntentId changing means a fresh quote/amount — remount the
    // card element (and Apple Pay's total) for a clean slate rather than
    // reusing stale ones.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentIntentId]);

  async function handlePay() {
    if (!cardRef.current) return;
    setError(null);
    setIsPending(true);
    const succeeded = await confirm(await cardRef.current.tokenize());
    // No setIsPending(false) on success — the parent takes over (creating
    // the booking) and replaces this UI once that resolves.
    if (!succeeded) setIsPending(false);
  }

  async function handleApplePay() {
    if (!applePayRef.current) return;
    setError(null);
    setIsApplePayPending(true);
    const succeeded = await confirm(await applePayRef.current.tokenize());
    if (!succeeded) setIsApplePayPending(false);
  }

  return (
    <div className="space-y-4">
      {applePayReady && (
        <>
          <button
            type="button"
            className="apple-pay-button"
            aria-label="Pay with Apple Pay"
            disabled={isApplePayPending || isPending}
            onClick={handleApplePay}
          />
          <div className="flex items-center gap-3 text-xs text-neutral-400">
            <div className="h-px flex-1 bg-neutral-200 dark:bg-neutral-700" />
            or pay with card
            <div className="h-px flex-1 bg-neutral-200 dark:bg-neutral-700" />
          </div>
        </>
      )}
      <div
        id="square-card-container"
        ref={containerRef}
        className="min-h-[56px] rounded-lg border border-neutral-300 dark:border-neutral-600 px-3 py-2"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <ButtonPrimary disabled={!isReady || isPending || isApplePayPending} loading={isPending} onClick={handlePay}>
        {buttonLabel}
      </ButtonPrimary>
    </div>
  );
}
