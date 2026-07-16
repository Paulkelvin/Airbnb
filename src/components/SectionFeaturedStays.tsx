import React, { FC } from "react";
import Link from "next/link";
import { ArrowRightIcon } from "@heroicons/react/24/outline";
import Heading from "@/components/ui/Heading";
import ButtonSecondary from "@/components/ui/ButtonSecondary";
import StayCard from "@/components/StayCard";
import type { StayDataType } from "@/data/types";
import type { Route } from "@/routers/types";

export interface SectionFeaturedStaysProps {
  className?: string;
  listings: StayDataType[];
  cities: string[];
}

const ALL_LISTINGS_HREF = "/listing-stay" as Route;

const SectionFeaturedStays: FC<SectionFeaturedStaysProps> = ({
  className = "",
  listings,
  cities,
}) => {
  if (listings.length === 0) return null;

  return (
    <div className={`nc-SectionFeaturedStays ${className}`}>
      <Heading desc="Hand-picked homes our guests love">
        Featured places to stay
      </Heading>

      <div className="flex flex-col gap-4 mb-8">
        {cities.length > 0 && (
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {cities.map((city, i) => (
              <Link
                key={city}
                href={`/listing-stay?city=${encodeURIComponent(city)}` as Route}
                className={`flex-none px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                  i === 0
                    ? "bg-neutral-900 text-white border-neutral-900 dark:bg-white dark:text-neutral-900"
                    : "border-neutral-200 text-neutral-700 hover:border-neutral-400 dark:border-neutral-700 dark:text-neutral-300 dark:hover:border-neutral-500"
                }`}
              >
                {city}
              </Link>
            ))}
          </div>
        )}
        <div className="flex justify-end">
          <Link
            href={ALL_LISTINGS_HREF}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full border border-neutral-200 dark:border-neutral-700 text-sm font-medium hover:border-neutral-400 dark:hover:border-neutral-500 transition-colors"
          >
            View all
            <ArrowRightIcon className="w-4 h-4" />
          </Link>
        </div>
      </div>

      <div className="flex flex-col gap-6 md:gap-8 max-w-2xl mx-auto w-full">
        {listings.map((listing) => (
          <StayCard key={listing.id} data={listing} />
        ))}
      </div>

      <div className="flex justify-center mt-10">
        <ButtonSecondary href={ALL_LISTINGS_HREF}>See more</ButtonSecondary>
      </div>
    </div>
  );
};

export default SectionFeaturedStays;
