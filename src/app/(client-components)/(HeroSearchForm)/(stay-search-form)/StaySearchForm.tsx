"use client";

import React, { FC, useState } from "react";
import LocationInput from "../LocationInput";
import GuestsInput from "../GuestsInput";
import StayDatesRangeInput from "./StayDatesRangeInput";
import type { Route } from "@/routers/types";

function toISODate(date: Date | null): string | null {
  return date ? date.toISOString().slice(0, 10) : null;
}

const StaySearchForm: FC<{}> = ({}) => {
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
      <form className="w-full relative mt-8 flex rounded-full shadow-xl dark:shadow-2xl bg-white dark:bg-neutral-800 ">
        <LocationInput className="flex-[1.5]" onInputDone={setCity} />
        <div className="self-center border-r border-slate-200 dark:border-slate-700 h-8"></div>
        <StayDatesRangeInput className="flex-1" onDatesChange={setDates} />
        <div className="self-center border-r border-slate-200 dark:border-slate-700 h-8"></div>
        <GuestsInput className="flex-1" buttonSubmitHref={submitLink} onGuestsChange={setGuests} />
      </form>
    );
  };

  return renderForm();
};

export default StaySearchForm;
