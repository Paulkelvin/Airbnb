"use client";

import converSelectedDateToString from "@/utils/converSelectedDateToString";
import React, { useState } from "react";
import { GuestsObject } from "../../type";
import GuestsInput from "../GuestsInput";
import LocationInput from "../LocationInput";
import DatesRangeInput from "../DatesRangeInput";

export interface StaySearchFormValues {
  city: string;
  startDate: Date | null;
  endDate: Date | null;
  guests: GuestsObject;
}

export interface StaySearchFormProps {
  onValuesChange?: (values: StaySearchFormValues) => void;
}

const StaySearchForm: React.FC<StaySearchFormProps> = ({ onValuesChange }) => {
  //
  const [fieldNameShow, setFieldNameShow] = useState<
    "location" | "dates" | "guests"
  >("location");
  //
  const [locationInputTo, setLocationInputTo] = useState("");
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
    onValuesChange?.({ city: locationInputTo, startDate: start, endDate: end, guests: guestInput });
    // Same auto-advance pattern as location -> dates above: once a full
    // range is picked, move on to the next step instead of leaving the
    // dates panel open showing the same "pick a range" instruction again.
    if (start && end) {
      setFieldNameShow("guests");
    }
  };

  const renderInputLocation = () => {
    const isActive = fieldNameShow === "location";
    return (
      <div
        className={`w-full bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 ${
          isActive ? "rounded-2xl" : "rounded-xl"
        }`}
      >
        {!isActive ? (
          <button
            className={`w-full flex justify-between text-sm font-medium p-4`}
            onClick={() => setFieldNameShow("location")}
          >
            <span className="text-neutral-400">Where</span>
            <span>{locationInputTo || "Location"}</span>
          </button>
        ) : (
          <LocationInput
            defaultValue={locationInputTo}
            onChange={(value) => {
              setLocationInputTo(value);
              setFieldNameShow("dates");
              onValuesChange?.({ city: value, startDate, endDate, guests: guestInput });
            }}
          />
        )}
      </div>
    );
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
              onValuesChange?.({ city: locationInputTo, startDate, endDate, guests: value });
            }}
          />
        )}
      </div>
    );
  };

  return (
    <div>
      <div className="w-full space-y-5">
        {/*  */}
        {renderInputLocation()}
        {/*  */}
        {renderInputDates()}
        {/*  */}
        {renderInputGuests()}
      </div>
    </div>
  );
};

export default StaySearchForm;
