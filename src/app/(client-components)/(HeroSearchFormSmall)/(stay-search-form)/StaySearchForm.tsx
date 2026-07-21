"use client";

import React, { FC, useState } from "react";
import LocationInput from "../LocationInput";
import GuestsInput from "../GuestsInput";
import StayDatesRangeInput from "./StayDatesRangeInput";
import { StaySearchFormFields } from "../../type";
import type { Route } from "@/routers/types";

export interface StaySearchFormProps {
  defaultFieldFocus?: StaySearchFormFields;
}

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

const StaySearchForm: FC<StaySearchFormProps> = ({ defaultFieldFocus }) => {
  const [city, setCity] = useState("");
  const [dates, setDates] = useState<[Date | null, Date | null]>([null, null]);
  const [guests, setGuests] = useState(0);

  const params = new URLSearchParams();
  if (city) params.set("city", city);
  const [checkIn, checkOut] = dates;
  if (checkIn && checkOut) {
    params.set("checkIn", toISODate(checkIn)!);
    params.set("checkOut", toISODate(checkOut)!);
  }
  if (guests > 0) params.set("guests", String(guests));

  const qs = params.toString();
  const submitLink = (qs ? `/listing-stay?${qs}` : "/listing-stay") as Route;

  const renderForm = () => {
    return (
      <form className="relative flex rounded-full border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800">
        <LocationInput
          className="flex-[1.5]"
          autoFocus={defaultFieldFocus === "location"}
          onInputDone={(value) => setCity(value)}
        />
        <div className="self-center border-r border-slate-200 dark:border-slate-700 h-8"></div>
        <StayDatesRangeInput className="flex-[1.2]" onDatesChange={setDates} />

        <div className="self-center border-r border-slate-200 dark:border-slate-700 h-8"></div>
        <GuestsInput
          className="flex-1"
          autoFocus={defaultFieldFocus === "guests"}
          submitLink={submitLink}
          onGuestsChange={setGuests}
        />
      </form>
    );
  };

  return renderForm();
};

export default StaySearchForm;
