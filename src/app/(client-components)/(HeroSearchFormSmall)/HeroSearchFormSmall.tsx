"use client";

import React, { FC } from "react";
import { StaySearchFormFields } from "../type";
import StaySearchForm from "./(stay-search-form)/StaySearchForm";

export interface HeroSearchFormSmallProps {
  className?: string;
  defaultFieldFocus?: StaySearchFormFields;
}

const HeroSearchFormSmall: FC<HeroSearchFormSmallProps> = ({
  className = "",
  defaultFieldFocus,
}) => {
  return (
    <div
      className={`nc-HeroSearchFormSmall ${className}`}
      data-nc-id="HeroSearchFormSmall"
    >
      <div className="mt-2">
        <StaySearchForm defaultFieldFocus={defaultFieldFocus} />
      </div>
    </div>
  );
};

export default HeroSearchFormSmall;
