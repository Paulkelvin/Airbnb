"use client";

import React, { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import DatePicker from "react-datepicker";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import ButtonPrimary from "@/components/ui/ButtonPrimary";
import NcInputNumber from "@/components/NcInputNumber";
import {
  createShortTermBooking,
  createBookingPaymentIntent,
  createLongTermBooking,
} from "@/modules/bookings/actions";
import { computeShortTermQuote, nightsBetween } from "@/modules/bookings/pricing";
import { isStripeCheckoutConfigured, getStripePublishableKey } from "@/lib/payments/client-config";
import StripePaymentStep from "./StripePaymentStep";
import type { ListingDetailViewModel } from "@/modules/listings/types";
import type { Route } from "@/routers/types";

const stripePromise = isStripeCheckoutConfigured() ? loadStripe(getStripePublishableKey()) : null;

interface BookingWidgetProps {
  listingId: string;
  currency: string;
  maxOccupants: number;
  isAuthenticated: boolean;
  pricing: ListingDetailViewModel["pricing"];
  blockedDates: string[];
  serviceFeePercent: number;
}

export default function BookingWidget({
  listingId,
  currency,
  maxOccupants,
  isAuthenticated,
  pricing,
  blockedDates,
  serviceFeePercent,
}: BookingWidgetProps) {
  if (!isAuthenticated) {
    return (
      <div className="text-center space-y-3">
        <p className="text-neutral-600 dark:text-neutral-300">
          Log in to book this {pricing.rentalType === "SHORT_TERM" ? "stay" : "lease"}.
        </p>
        <ButtonPrimary href={`/login?callbackUrl=${encodeURIComponent(typeof window !== "undefined" ? window.location.pathname : "")}` as Route}>Log in</ButtonPrimary>
      </div>
    );
  }

  return pricing.rentalType === "SHORT_TERM" ? (
    <ShortTermBookingForm
      listingId={listingId}
      currency={currency}
      maxOccupants={maxOccupants}
      pricing={pricing}
      blockedDates={blockedDates}
      serviceFeePercent={serviceFeePercent}
    />
  ) : (
    <LongTermBookingForm listingId={listingId} currency={currency} pricing={pricing} />
  );
}

function ShortTermBookingForm({
  listingId,
  currency,
  maxOccupants,
  pricing,
  blockedDates,
  serviceFeePercent,
}: {
  listingId: string;
  currency: string;
  maxOccupants: number;
  pricing: Extract<ListingDetailViewModel["pricing"], { rentalType: "SHORT_TERM" }>;
  blockedDates: string[];
  serviceFeePercent: number;
}) {
  const router = useRouter();
  const [checkInDate, setCheckInDate] = useState<Date | null>(null);
  const [checkOutDate, setCheckOutDate] = useState<Date | null>(null);
  const [guestCount, setGuestCount] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Real card collection (embedded Stripe Elements) only applies to instant
  // book: "Request to book" doesn't charge until the host approves, so
  // there's nothing to pay yet at this step. Falls back to the pre-existing
  // one-step flow (no paymentIntentId) whenever Stripe isn't configured —
  // that path still works exactly as before via createCharge's dev/stub
  // handling.
  const needsCardCollection = pricing.instantBook && isStripeCheckoutConfigured();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isFetchingIntent, setIsFetchingIntent] = useState(false);

  const excludeDates = useMemo(() => blockedDates.map((d) => new Date(d)), [blockedDates]);

  const nights = checkInDate && checkOutDate ? nightsBetween(checkInDate, checkOutDate) : 0;
  const quote = nights > 0 ? computeShortTermQuote({ ...pricing, nights, serviceFeePercent }) : null;

  const idempotencyKey = useMemo(
    () => crypto.randomUUID(),
    [checkInDate?.getTime(), checkOutDate?.getTime(), guestCount],
  );

  // A previously-fetched PaymentIntent was priced for the dates/guest count
  // at the time — invalidate it the moment any of those change so a stale
  // intent (wrong amount) can never be confirmed against a different quote.
  useEffect(() => {
    setClientSecret(null);
  }, [checkInDate?.getTime(), checkOutDate?.getTime(), guestCount]);

  const nightsTooFew = nights > 0 && nights < pricing.minNights;
  const nightsTooMany = pricing.maxNights !== null && nights > pricing.maxNights;
  const canSubmit = nights > 0 && !nightsTooFew && !nightsTooMany;

  function handleSubmit() {
    if (!checkInDate || !checkOutDate || !canSubmit) return;
    setError(null);
    startTransition(async () => {
      const result = await createShortTermBooking({
        listingId,
        checkInDate,
        checkOutDate,
        guestCount,
        idempotencyKey,
      });
      if (!result.success) {
        setError(result.error.message);
        return;
      }
      router.push(`/account-bookings/${result.data.id}` as Route);
    });
  }

  function handleContinueToPayment() {
    if (!checkInDate || !checkOutDate || !canSubmit) return;
    setError(null);
    setIsFetchingIntent(true);
    startTransition(async () => {
      const result = await createBookingPaymentIntent({
        listingId,
        checkInDate,
        checkOutDate,
        guestCount,
      });
      setIsFetchingIntent(false);
      if (!result.success) {
        setError(result.error.message);
        return;
      }
      setClientSecret(result.data.clientSecret);
    });
  }

  function handlePaymentConfirmed(paymentIntentId: string) {
    if (!checkInDate || !checkOutDate) return;
    setError(null);
    startTransition(async () => {
      const result = await createShortTermBooking({
        listingId,
        checkInDate,
        checkOutDate,
        guestCount,
        idempotencyKey,
        paymentIntentId,
      });
      if (!result.success) {
        setError(result.error.message);
        return;
      }
      router.push(`/account-bookings/${result.data.id}` as Route);
    });
  }

  return (
    <div className="space-y-5">
      <div className="border border-neutral-200 dark:border-neutral-700 rounded-3xl p-4 space-y-4">
        <div>
          <label className="block text-xs font-medium text-neutral-500 mb-1">
            Check in — Check out
          </label>
          <DatePicker
            selected={checkInDate}
            onChange={(dates) => {
              const [start, end] = dates as [Date | null, Date | null];
              setCheckInDate(start);
              setCheckOutDate(end);
            }}
            startDate={checkInDate}
            endDate={checkOutDate}
            selectsRange
            minDate={new Date()}
            excludeDates={excludeDates}
            monthsShown={1}
            className="w-full text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg px-3 py-2 bg-transparent"
            placeholderText="Add dates"
            portalId="datepicker-portal"
            popperClassName="!z-[100]"
          />
        </div>
        <NcInputNumber
          label="Guests"
          defaultValue={guestCount}
          min={1}
          max={maxOccupants}
          onChange={setGuestCount}
        />
      </div>

      {nightsTooFew && (
        <p className="text-sm text-red-600">Minimum stay is {pricing.minNights} nights</p>
      )}
      {nightsTooMany && (
        <p className="text-sm text-red-600">Maximum stay is {pricing.maxNights} nights</p>
      )}

      {quote && (
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>
              ${pricing.nightlyPrice} x {nights} night{nights !== 1 ? "s" : ""}
            </span>
            <span>${quote.nightlyTotal.toFixed(2)}</span>
          </div>
          {quote.discountAmount > 0 && (
            <div className="flex justify-between text-green-600">
              <span>Length-of-stay discount</span>
              <span>-${quote.discountAmount.toFixed(2)}</span>
            </div>
          )}
          {quote.cleaningFee > 0 && (
            <div className="flex justify-between">
              <span>Cleaning fee</span>
              <span>${quote.cleaningFee.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span>Service fee</span>
            <span>${quote.serviceFee.toFixed(2)}</span>
          </div>
          <div className="border-t border-neutral-200 dark:border-neutral-700 pt-2 flex justify-between font-semibold">
            <span>Total ({currency})</span>
            <span>${quote.totalPrice.toFixed(2)}</span>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      {needsCardCollection ? (
        clientSecret && stripePromise ? (
          <Elements
            stripe={stripePromise}
            options={{
              clientSecret,
              appearance: {
                theme: typeof document !== "undefined" && document.documentElement.classList.contains("dark")
                  ? "night"
                  : "stripe",
              },
            }}
          >
            <StripePaymentStep onConfirmed={handlePaymentConfirmed} buttonLabel="Pay & Reserve" />
          </Elements>
        ) : (
          <ButtonPrimary
            disabled={!canSubmit || isFetchingIntent}
            loading={isFetchingIntent}
            onClick={handleContinueToPayment}
          >
            Continue to payment
          </ButtonPrimary>
        )
      ) : (
        <>
          <ButtonPrimary disabled={!canSubmit || isPending} loading={isPending} onClick={handleSubmit}>
            {pricing.instantBook ? "Reserve" : "Request to book"}
          </ButtonPrimary>
          {!pricing.instantBook && (
            <p className="text-xs text-center text-neutral-500">
              You won&apos;t be charged yet — the host will confirm your request.
            </p>
          )}
        </>
      )}
    </div>
  );
}

function LongTermBookingForm({
  listingId,
  currency,
  pricing,
}: {
  listingId: string;
  currency: string;
  pricing: Extract<ListingDetailViewModel["pricing"], { rentalType: "LONG_TERM" }>;
}) {
  const router = useRouter();
  const earliestStart = useMemo(() => {
    const today = new Date(new Date().toDateString());
    const availableFrom = pricing.availableFromDate ? new Date(pricing.availableFromDate) : null;
    return availableFrom && availableFrom > today ? availableFrom : today;
  }, [pricing.availableFromDate]);

  const [leaseStartDate, setLeaseStartDate] = useState<Date | null>(null);
  const [leaseTermMonths, setLeaseTermMonths] = useState(pricing.minLeaseTermMonths);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const idempotencyKey = useMemo(
    () => crypto.randomUUID(),
    [leaseStartDate?.getTime(), leaseTermMonths],
  );

  function handleSubmit() {
    if (!leaseStartDate) return;
    setError(null);
    startTransition(async () => {
      const result = await createLongTermBooking({
        listingId,
        leaseStartDate,
        leaseTermMonths,
        idempotencyKey,
      });
      if (!result.success) {
        setError(result.error.message);
        return;
      }
      router.push(`/account-bookings/${result.data.id}` as Route);
    });
  }

  return (
    <div className="space-y-5">
      <div className="border border-neutral-200 dark:border-neutral-700 rounded-3xl p-4 space-y-4">
        <div>
          <label className="block text-xs font-medium text-neutral-500 mb-1">Move-in date</label>
          <DatePicker
            selected={leaseStartDate}
            onChange={(date) => setLeaseStartDate(date as Date | null)}
            minDate={earliestStart}
            className="w-full text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg px-3 py-2 bg-transparent"
            placeholderText="Select a date"
            portalId="datepicker-portal"
            popperClassName="!z-[100]"
          />
        </div>
        <NcInputNumber
          label="Lease term (months)"
          defaultValue={leaseTermMonths}
          min={pricing.minLeaseTermMonths}
          max={pricing.maxLeaseTermMonths ?? undefined}
          onChange={setLeaseTermMonths}
        />
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span>Monthly rent</span>
          <span>${pricing.monthlyRent.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span>{leaseTermMonths} month{leaseTermMonths !== 1 ? "s" : ""} x ${pricing.monthlyRent.toFixed(2)}/mo</span>
          <span>${(leaseTermMonths * pricing.monthlyRent).toFixed(2)}</span>
        </div>
        {pricing.securityDeposit !== null && (
          <div className="flex justify-between">
            <span>Security deposit</span>
            <span>${pricing.securityDeposit.toFixed(2)}</span>
          </div>
        )}
        <div className="border-t border-neutral-200 dark:border-neutral-700 pt-2 flex justify-between font-semibold">
          <span>Total ({currency})</span>
          <span>${((leaseTermMonths * pricing.monthlyRent) + (pricing.securityDeposit ?? 0)).toFixed(2)}</span>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <ButtonPrimary disabled={!leaseStartDate || isPending} loading={isPending} onClick={handleSubmit}>
        Apply to lease
      </ButtonPrimary>
      <p className="text-xs text-center text-neutral-500">
        The host will review your application before confirming.
      </p>
    </div>
  );
}
