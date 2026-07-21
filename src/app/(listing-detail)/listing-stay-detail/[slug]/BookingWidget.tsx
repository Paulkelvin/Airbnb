"use client";

import React, { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import DatePicker from "react-datepicker";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import ButtonPrimary from "@/components/ui/ButtonPrimary";
import NcInputNumber from "@/components/NcInputNumber";
import GuestSelector, { type GuestBreakdown } from "./GuestSelector";
import InlineBookingAuth from "./InlineBookingAuth";
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
  // Dates/guests are always pickable, logged in or not — identity is only
  // asked for at the point the guest actually tries to reserve (see
  // requireAuthThen in both forms below), via an inline passwordless step
  // instead of a hard wall in front of the whole widget.
  return pricing.rentalType === "SHORT_TERM" ? (
    <ShortTermBookingForm
      listingId={listingId}
      currency={currency}
      maxOccupants={maxOccupants}
      isAuthenticated={isAuthenticated}
      pricing={pricing}
      blockedDates={blockedDates}
      serviceFeePercent={serviceFeePercent}
    />
  ) : (
    <LongTermBookingForm
      listingId={listingId}
      currency={currency}
      isAuthenticated={isAuthenticated}
      pricing={pricing}
    />
  );
}

function ShortTermBookingForm({
  listingId,
  currency,
  maxOccupants,
  isAuthenticated: initialIsAuthenticated,
  pricing,
  blockedDates,
  serviceFeePercent,
}: {
  listingId: string;
  currency: string;
  maxOccupants: number;
  isAuthenticated: boolean;
  pricing: Extract<ListingDetailViewModel["pricing"], { rentalType: "SHORT_TERM" }>;
  blockedDates: string[];
  serviceFeePercent: number;
}) {
  const router = useRouter();
  // Local, optimistic copy of auth state: flips true the instant the inline
  // OTP step succeeds, without waiting on a server round-trip, so the
  // pending action (below) can continue immediately in the same render
  // rather than making the guest click Reserve twice.
  const [isAuthenticated, setIsAuthenticated] = useState(initialIsAuthenticated);
  const [showAuth, setShowAuth] = useState(false);
  const pendingActionRef = useRef<(() => void) | null>(null);
  const searchParams = useSearchParams();
  // Pre-fill from the Hero's "Check availability" widget (?checkIn=&checkOut=&guests=)
  // so picking dates on the homepage doesn't get thrown away on arrival here.
  const initialDates = useMemo(() => {
    // ?checkIn=2026-07-25 is a date-only string, which parses as *UTC*
    // midnight per spec — but the date picker below highlights by *local*
    // calendar day, so for any negative-UTC-offset guest (all of the US)
    // that would prefill one day earlier than what they actually picked on
    // the homepage. Building the Date from the Y-M-D components directly
    // keeps it anchored to the intended calendar day (same fix as
    // excludeDates below).
    const parse = (value: string | null) => {
      if (!value) return null;
      const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
      if (match) {
        const [, year, month, day] = match;
        return new Date(Number(year), Number(month) - 1, Number(day));
      }
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? null : date;
    };
    return {
      checkIn: parse(searchParams.get("checkIn")),
      checkOut: parse(searchParams.get("checkOut")),
      guests: Number(searchParams.get("guests")) || 1,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [checkInDate, setCheckInDate] = useState<Date | null>(initialDates.checkIn);
  const [checkOutDate, setCheckOutDate] = useState<Date | null>(initialDates.checkOut);
  const [guestBreakdown, setGuestBreakdown] = useState<GuestBreakdown>({
    adults: Math.max(1, Math.min(initialDates.guests, maxOccupants)),
    children: 0,
    infants: 0,
    pets: 0,
  });
  const guestCount = guestBreakdown.adults + guestBreakdown.children;
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

  // blockedDates are full UTC ISO strings (e.g. "2026-07-25T00:00:00.000Z").
  // Parsing those with `new Date(d)` and letting react-datepicker compare
  // them against its *local* calendar grid shows the wrong day as blocked
  // for any negative-UTC-offset guest (i.e. everyone in the US) — the UTC
  // midnight instant falls on the previous local evening. Building the Date
  // from the Y-M-D components directly keeps it anchored to the intended
  // calendar day regardless of the guest's timezone.
  const excludeDates = useMemo(
    () =>
      blockedDates.map((d) => {
        const [year, month, day] = d.slice(0, 10).split("-").map(Number);
        return new Date(year, month - 1, day);
      }),
    [blockedDates],
  );

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

  const sameDay = checkInDate != null && checkOutDate != null && nights === 0;
  const nightsTooFew = nights > 0 && nights < pricing.minNights;
  const nightsTooMany = pricing.maxNights !== null && nights > pricing.maxNights;
  const canSubmit = nights > 0 && !nightsTooFew && !nightsTooMany;

  function handleSubmit() {
    if (!checkInDate || !checkOutDate || !canSubmit) return;
    setError(null);
    startTransition(async () => {
      try {
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
      } catch {
        // requireAuth() throws rather than returning an ActionResult if the
        // session expired between the OTP step and this call — surface that
        // as a normal inline error instead of an unhandled rejection.
        setError("Your session expired. Please confirm your booking again.");
      }
    });
  }

  function handleContinueToPayment() {
    if (!checkInDate || !checkOutDate || !canSubmit) return;
    setError(null);
    setIsFetchingIntent(true);
    startTransition(async () => {
      try {
        const result = await createBookingPaymentIntent({
          listingId,
          checkInDate,
          checkOutDate,
          guestCount,
        });
        if (!result.success) {
          setError(result.error.message);
          return;
        }
        setClientSecret(result.data.clientSecret);
      } catch {
        setError("Your session expired. Please confirm your booking again.");
      } finally {
        setIsFetchingIntent(false);
      }
    });
  }

  function handlePaymentConfirmed(paymentIntentId: string) {
    if (!checkInDate || !checkOutDate) return;
    setError(null);
    startTransition(async () => {
      try {
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
      } catch {
        setError("Your session expired. Please confirm your booking again.");
      }
    });
  }

  // Dates/guests picked as a guest aren't lost here — this only intercepts
  // the actual reserve/pay click, not the date picker above it.
  function requireAuthThen(action: () => void) {
    if (isAuthenticated) {
      action();
      return;
    }
    pendingActionRef.current = action;
    setShowAuth(true);
  }

  function handleAuthenticated() {
    setIsAuthenticated(true);
    setShowAuth(false);
    router.refresh();
    const action = pendingActionRef.current;
    pendingActionRef.current = null;
    action?.();
  }

  return (
    <div className="space-y-5">
      <div className="border border-neutral-200 dark:border-neutral-700 rounded-3xl p-4 space-y-4">
        <div>
          <label className="block text-xs font-medium text-neutral-500 mb-1">
            Check in — Check out
          </label>
          {(!checkInDate || !checkOutDate) && (
            <p className="mb-1 text-xs text-neutral-400">
              {checkInDate && !checkOutDate
                ? "Now pick your check-out date"
                : "Pick a check-in date, then a check-out date"}
            </p>
          )}
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
            readOnly
          />
        </div>
        <GuestSelector
          maxOccupants={maxOccupants}
          petsAllowed={pricing.petPolicy !== "NOT_ALLOWED"}
          value={guestBreakdown}
          onChange={setGuestBreakdown}
        />
      </div>

      <div className={`grid transition-[grid-template-rows,opacity] duration-200 ease-in-out ${sameDay ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
        <div className="overflow-hidden">
          <p className="text-sm text-neutral-500">Pick a different check-out date — check-in and check-out can&apos;t be the same day.</p>
        </div>
      </div>
      <div className={`grid transition-[grid-template-rows,opacity] duration-200 ease-in-out ${nightsTooFew ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
        <div className="overflow-hidden">
          <p className="text-sm text-red-600">Minimum stay is {pricing.minNights} nights</p>
        </div>
      </div>
      <div className={`grid transition-[grid-template-rows,opacity] duration-200 ease-in-out ${nightsTooMany ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
        <div className="overflow-hidden">
          <p className="text-sm text-red-600">Maximum stay is {pricing.maxNights} nights</p>
        </div>
      </div>

      <div className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out ${quote ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
        <div className="overflow-hidden">
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
        </div>
      </div>

      <div className={`grid transition-[grid-template-rows,opacity] duration-200 ease-in-out ${error ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
        <div className="overflow-hidden">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      </div>

      <div className="transition-opacity duration-200 ease-in-out">
      {showAuth ? (
        <div className="animate-fadeIn">
          <InlineBookingAuth onAuthenticated={handleAuthenticated} />
        </div>
      ) : needsCardCollection ? (
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
            onClick={() => requireAuthThen(handleContinueToPayment)}
          >
            Continue to payment
          </ButtonPrimary>
        )
      ) : (
        <>
          <ButtonPrimary
            disabled={!canSubmit || isPending}
            loading={isPending}
            onClick={() => requireAuthThen(handleSubmit)}
          >
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
    </div>
  );
}

function LongTermBookingForm({
  listingId,
  currency,
  isAuthenticated: initialIsAuthenticated,
  pricing,
}: {
  listingId: string;
  currency: string;
  isAuthenticated: boolean;
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
  const [isAuthenticated, setIsAuthenticated] = useState(initialIsAuthenticated);
  const [showAuth, setShowAuth] = useState(false);

  const idempotencyKey = useMemo(
    () => crypto.randomUUID(),
    [leaseStartDate?.getTime(), leaseTermMonths],
  );

  function handleSubmit() {
    if (!leaseStartDate) return;
    setError(null);
    startTransition(async () => {
      try {
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
      } catch {
        setError("Your session expired. Please confirm your application again.");
      }
    });
  }

  function handlePrimaryClick() {
    if (isAuthenticated) {
      handleSubmit();
      return;
    }
    setShowAuth(true);
  }

  function handleAuthenticated() {
    setIsAuthenticated(true);
    setShowAuth(false);
    router.refresh();
    handleSubmit();
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
            readOnly
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

      <div className={`grid transition-[grid-template-rows,opacity] duration-200 ease-in-out ${error ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
        <div className="overflow-hidden">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      </div>

      <div className="transition-opacity duration-200 ease-in-out">
        {showAuth ? (
          <div className="animate-fadeIn">
            <InlineBookingAuth onAuthenticated={handleAuthenticated} />
          </div>
        ) : (
          <>
            <ButtonPrimary disabled={!leaseStartDate || isPending} loading={isPending} onClick={handlePrimaryClick}>
              Apply to lease
            </ButtonPrimary>
            <p className="text-xs text-center text-neutral-500">
              The host will review your application before confirming.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
