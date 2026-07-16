import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import React from "react";
import { ReactDatePickerCustomHeaderProps } from "react-datepicker";

interface Props extends ReactDatePickerCustomHeaderProps {
  /** How many months this DatePicker instance renders side by side (default 2, matching the component's original hard-coded assumption). Each visible month only shows the nav arrow that moves away from its neighbors — e.g. with 2 months shown, only the first has a "previous" arrow and only the last has a "next" arrow. */
  monthsShown?: number;
}

const DatePickerCustomHeaderTwoMonth = ({
  monthDate,
  customHeaderCount,
  decreaseMonth,
  increaseMonth,
  monthsShown = 2,
}: Props) => {
  const isFirstVisibleMonth = customHeaderCount === 0;
  const isLastVisibleMonth = customHeaderCount === monthsShown - 1;

  return (
    <div>
      <button
        aria-label="Previous Month"
        className={
          "react-datepicker__navigation react-datepicker__navigation--previous absolute -top-1 left-0 flex items-center justify-center p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
        }
        style={isFirstVisibleMonth ? {} : { visibility: "hidden" }}
        onClick={decreaseMonth}
        type="button"
      >
        <span className="react-datepicker__navigation-icon react-datepicker__navigation-icon--previous">
          <ChevronLeftIcon className="w-5 h-5" />
        </span>
      </button>
      <span className="react-datepicker__current-month">
        {monthDate.toLocaleString("en-US", {
          month: "long",
          year: "numeric",
        })}
      </span>
      <button
        aria-label="Next Month"
        className="react-datepicker__navigation react-datepicker__navigation--next absolute -top-1 -right-0 flex items-center justify-center p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
        style={isLastVisibleMonth ? {} : { visibility: "hidden" }}
        type="button"
        onClick={increaseMonth}
      >
        <span className="react-datepicker__navigation-icon react-datepicker__navigation-icon--next">
          <ChevronRightIcon className="w-5 h-5" />
        </span>
      </button>
    </div>
  );
};

export default DatePickerCustomHeaderTwoMonth;
