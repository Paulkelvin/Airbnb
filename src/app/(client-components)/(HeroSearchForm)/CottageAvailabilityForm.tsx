"use client";

import React, { FC, useState } from "react";
import StayDatesRangeInput from "./(stay-search-form)/StayDatesRangeInput";
import GuestsInput from "./GuestsInput";
import type { Route } from "@/routers/types";

// date-picker values are constructed at *local* midnight — converting with
// toISOString() first shifts to UTC and can roll the date back a day for
// any negative-UTC-offset guest, so build the string from local getters.
function toISODate(date: Date | null): string | null {
  if (!date) return null;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Potomac Vista Cottage is the only property, so there's nothing to search
 * by location — this is StaySearchForm's dates+guests half, submitting
 * straight to the cottage's own listing page (with dates/guests as query
 * params BookingWidget reads to pre-fill itself) instead of a multi-listing
 * search results page.
 */
const CottageAvailabilityForm: FC<{ listingHref: string }> = ({ listingHref }) => {
  const [dates, setDates] = useState<[Date | null, Date | null]>([null, null]);
  const [guests, setGuests] = useState(0);

  const params = new URLSearchParams();
  const [checkIn, checkOut] = dates;
  if (checkIn && checkOut) {
    params.set("checkIn", toISODate(checkIn)!);
    params.set("checkOut", toISODate(checkOut)!);
  }
  if (guests > 0) params.set("guests", String(guests));

  const qs = params.toString();
  const submitLink = (qs ? `${listingHref}?${qs}` : listingHref) as Route;

  return (
    <form className="w-full relative mt-8 flex rounded-full shadow-xl dark:shadow-2xl bg-white dark:bg-neutral-800">
      <StayDatesRangeInput className="flex-1" onDatesChange={setDates} />
      <div className="self-center border-r border-slate-200 dark:border-slate-700 h-8"></div>
      <GuestsInput className="flex-1" buttonSubmitHref={submitLink} onGuestsChange={setGuests} />
    </form>
  );
};

export default CottageAvailabilityForm;
