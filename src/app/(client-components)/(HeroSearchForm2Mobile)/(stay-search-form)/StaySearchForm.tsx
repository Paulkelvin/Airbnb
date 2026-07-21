"use client";

import converSelectedDateToString from "@/utils/converSelectedDateToString";
import React, { useState } from "react";
import { GuestsObject } from "../../type";
import GuestsInput from "../GuestsInput";
import DatesRangeInput from "../DatesRangeInput";

export interface StaySearchFormValues {
  startDate: Date | null;
  endDate: Date | null;
  guests: GuestsObject;
}

export interface StaySearchFormProps {
  onValuesChange?: (values: StaySearchFormValues) => void;
}

/**
 * Potomac Vista Cottage is the only property, so there's nothing to search
 * by location — this is the same dates -> guests stepper as before, just
 * without the "Where" step (see CottageAvailabilityForm, its desktop
 * equivalent, for the same simplification).
 */
const StaySearchForm: React.FC<StaySearchFormProps> = ({ onValuesChange }) => {
  const [fieldNameShow, setFieldNameShow] = useState<"dates" | "guests">("dates");
  //
  const [guestInput, setGuestInput] = useState<GuestsObject>({
    guestAdults: 0,
    guestChildren: 0,
    guestInfants: 0,
  });
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  //

  const onChangeDate = (dates: [Date | null, Date | null]) => {
    const [start, end] = dates;
    setStartDate(start);
    setEndDate(end);
    onValuesChange?.({ startDate: start, endDate: end, guests: guestInput });
    // Once a full range is picked, move on to guests instead of leaving the
    // dates panel open showing the same "pick a range" instruction again.
    if (start && end) {
      setFieldNameShow("guests");
    }
  };

  const renderInputDates = () => {
    const isActive = fieldNameShow === "dates";

    return (
      <div
        className={`w-full bg-white dark:bg-neutral-800 overflow-hidden border border-neutral-200 dark:border-neutral-700 ${
          isActive ? "rounded-2xl" : "rounded-xl"
        }`}
      >
        {!isActive ? (
          <button
            className={`w-full flex justify-between text-sm font-medium p-4  `}
            onClick={() => setFieldNameShow("dates")}
          >
            <span className="text-neutral-400">When</span>
            <span>
              {startDate
                ? converSelectedDateToString([startDate, endDate])
                : "Add date"}
            </span>
          </button>
        ) : (
          <DatesRangeInput
            startDate={startDate}
            endDate={endDate}
            onChange={onChangeDate}
          />
        )}
      </div>
    );
  };

  const renderInputGuests = () => {
    const isActive = fieldNameShow === "guests";
    let guestSelected = "";
    if (guestInput.guestAdults || guestInput.guestChildren) {
      const guest =
        (guestInput.guestAdults || 0) + (guestInput.guestChildren || 0);
      guestSelected += `${guest} guests`;
    }

    if (guestInput.guestInfants) {
      guestSelected += `, ${guestInput.guestInfants} infants`;
    }

    return (
      <div
        className={`w-full bg-white dark:bg-neutral-800 overflow-hidden border border-neutral-200 dark:border-neutral-700 ${
          isActive ? "rounded-2xl" : "rounded-xl"
        }`}
      >
        {!isActive ? (
          <button
            className={`w-full flex justify-between text-sm font-medium p-4`}
            onClick={() => setFieldNameShow("guests")}
          >
            <span className="text-neutral-400">Who</span>
            <span>{guestSelected || `Add guests`}</span>
          </button>
        ) : (
          <GuestsInput
            defaultValue={guestInput}
            onChange={(value) => {
              setGuestInput(value);
              onValuesChange?.({ startDate, endDate, guests: value });
            }}
          />
        )}
      </div>
    );
  };

  return (
    <div>
      <div className="w-full space-y-5">
        {renderInputDates()}
        {renderInputGuests()}
      </div>
    </div>
  );
};

export default StaySearchForm;
