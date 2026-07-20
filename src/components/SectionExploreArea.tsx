import React, { FC } from "react";
import { ArrowRightIcon } from "@heroicons/react/24/outline";
import Heading from "@/components/ui/Heading";
import ButtonSecondary from "@/components/ui/ButtonSecondary";
import AttractionCard from "@/components/AttractionCard";
import type { Attraction } from "@/data/attractions";
import type { Route } from "@/routers/types";

export interface SectionExploreAreaProps {
  className?: string;
  attractions: Attraction[];
}

const EXPLORE_HREF = "/explore-the-area" as Route;

const SectionExploreArea: FC<SectionExploreAreaProps> = ({ className = "", attractions }) => {
  if (attractions.length === 0) return null;

  return (
    <div className={`nc-SectionExploreArea ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
        <Heading
          className="mb-0"
          desc="Restaurants, parks, and waterfronts within easy reach of the cottage"
        >
          Explore the Area
        </Heading>
        <ButtonSecondary href={EXPLORE_HREF} className="gap-1.5 flex-shrink-0">
          View all
          <ArrowRightIcon className="w-4 h-4" />
        </ButtonSecondary>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
        {attractions.map((attraction) => (
          <AttractionCard key={attraction.id} data={attraction} />
        ))}
      </div>
    </div>
  );
};

export default SectionExploreArea;
