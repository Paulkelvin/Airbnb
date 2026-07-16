"use client";

import DatePicker from "react-datepicker";
import React, { FC } from "react";
import { useWindowSize } from "react-use";
import DatePickerCustomHeaderTwoMonth from "@/components/DatePickerCustomHeaderTwoMonth";
import DatePickerCustomDay from "@/components/DatePickerCustomDay";

export interface StayDatesRangeInputProps {
  className?: string;
  startDate: Date | null;
  endDate: Date | null;
  onChange: (dates: [Date | null, Date | null]) => void;
}

const StayDatesRangeInput: FC<StayDatesRangeInputProps> = ({
  className = "",
  startDate,
  endDate,
  onChange,
}) => {
  // Two months side by side is cramped on a phone-width viewport — collapse
  // to one month there so the modal isn't dominated by the calendar; the
  // header's existing prev/next arrows already give month-to-month
  // navigation, so nothing is lost, just decluttered.
  const { width } = useWindowSize();
  const monthsShown = width < 640 ? 1 : 2;

  return (
    <div>
      <div className="p-5">
        <span className="block font-semibold text-xl sm:text-2xl">
          {` When's your trip?`}
        </span>
      </div>
      <div
        className={`relative flex-shrink-0 flex justify-center z-10 py-5 transition-all duration-300 ease-in-out ${className} `}
      >
        <DatePicker
          selected={startDate}
          onChange={onChange}
          startDate={startDate}
          endDate={endDate}
          selectsRange
          monthsShown={monthsShown}
          showPopperArrow={false}
          inline
          renderCustomHeader={(p) => (
            <DatePickerCustomHeaderTwoMonth {...p} monthsShown={monthsShown} />
          )}
          renderDayContents={(day, date) => (
            <DatePickerCustomDay dayOfMonth={day} date={date} />
          )}
        />
      </div>
    </div>
  );
};

export default StayDatesRangeInput;
