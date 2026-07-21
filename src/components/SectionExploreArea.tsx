import React, { FC } from "react";
import { ArrowRightIcon } from "@heroicons/react/24/outline";
import Heading from "@/components/ui/Heading";
import ButtonSecondary from "@/components/ui/ButtonSecondary";
import LocalExperienceCard from "@/components/LocalExperienceCard";
import ExploreAreaMap from "@/components/ExploreAreaMap/ExploreAreaMap";
import type { LocalExperience } from "@/data/local-experiences";
import type { Route } from "@/routers/types";

export interface SectionExploreAreaProps {
  className?: string;
  experiences: LocalExperience[];
  /** All experiences (not just featured) — plotted on the map so it isn't
   * missing the ones that didn't make the homepage's featured cut. */
  allExperiences: LocalExperience[];
  cottage: { lat: number; lng: number; label: string } | null;
}

const EXPLORE_HREF = "/explore-the-area" as Route;

const SectionExploreArea: FC<SectionExploreAreaProps> = ({
  className = "",
  experiences,
  allExperiences,
  cottage,
}) => {
  if (experiences.length === 0) return null;

  return (
    <div className={`nc-SectionExploreArea ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
        <Heading
          className="mb-0"
          desc="Wake up steps from the water at the cottage, then venture out — some of the area's best waterfront parks, restaurants, and attractions are just minutes away."
        >
          Things to Do Near Potomac Vista Cottage
        </Heading>
        <ButtonSecondary href={EXPLORE_HREF} className="gap-1.5 flex-shrink-0">
          View all
          <ArrowRightIcon className="w-4 h-4" />
        </ButtonSecondary>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
        {experiences.map((experience) => (
          <LocalExperienceCard key={experience.id} data={experience} />
        ))}
      </div>

      {cottage && (
        <div className="mt-10">
          <h3 className="text-lg font-semibold mb-4">See it on the map</h3>
          <ExploreAreaMap className="h-96" cottage={cottage} experiences={allExperiences} />
        </div>
      )}
    </div>
  );
};

export default SectionExploreArea;
