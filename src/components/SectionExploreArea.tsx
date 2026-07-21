"use client";

import React, { FC, useMemo, useState } from "react";
import { ArrowRightIcon } from "@heroicons/react/24/outline";
import Heading from "@/components/ui/Heading";
import ButtonSecondary from "@/components/ui/ButtonSecondary";
import LocalExperienceCard from "@/components/LocalExperienceCard";
import ExploreAreaMap from "@/components/ExploreAreaMap/ExploreAreaMap";
import { CATEGORY_EMOJI, type LocalExperience } from "@/data/local-experiences";
import type { Route } from "@/routers/types";

export interface SectionExploreAreaProps {
  className?: string;
  /** Curated/featured set shown by default (the "All" view). */
  experiences: LocalExperience[];
  /** Full site experience list — used for category filtering (so a category
   * tag still works even if none of its items made the featured cut) and
   * for the map, which shouldn't be missing anything. */
  allExperiences: LocalExperience[];
  cottage: { lat: number; lng: number; label: string } | null;
  /** Caps how many cards render on the homepage, regardless of filter. */
  limit?: number;
}

const SectionExploreArea: FC<SectionExploreAreaProps> = ({
  className = "",
  experiences,
  allExperiences,
  cottage,
  limit = 6,
}) => {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const categories = useMemo(
    () => Array.from(new Set(allExperiences.map((e) => e.category))),
    [allExperiences],
  );

  const visible = useMemo(() => {
    const source = activeCategory
      ? allExperiences.filter((e) => e.category === activeCategory)
      : experiences;
    return source.slice(0, limit);
  }, [activeCategory, allExperiences, experiences, limit]);

  const viewAllHref = (
    activeCategory
      ? `/explore-the-area?category=${encodeURIComponent(activeCategory)}`
      : "/explore-the-area"
  ) as Route;

  if (experiences.length === 0 && allExperiences.length === 0) return null;

  return (
    <div className={`nc-SectionExploreArea ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
        <Heading
          className="mb-0"
          desc="Wake up steps from the water at the cottage, then venture out — some of the area's best waterfront parks, restaurants, and attractions are just minutes away."
        >
          Things to Do Near Potomac Vista Cottage
        </Heading>
        <ButtonSecondary href={viewAllHref} className="gap-1.5 flex-shrink-0">
          View all
          <ArrowRightIcon className="w-4 h-4" />
        </ButtonSecondary>
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar mb-8 pb-1">
        <button
          type="button"
          onClick={() => setActiveCategory(null)}
          className={`flex-none px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
            !activeCategory
              ? "bg-neutral-900 text-white border-neutral-900 dark:bg-white dark:text-neutral-900"
              : "border-neutral-200 text-neutral-700 hover:border-neutral-400 dark:border-neutral-700 dark:text-neutral-300 dark:hover:border-neutral-500"
          }`}
        >
          All
        </button>
        {categories.map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => setActiveCategory(category)}
            className={`flex-none px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
              activeCategory === category
                ? "bg-neutral-900 text-white border-neutral-900 dark:bg-white dark:text-neutral-900"
                : "border-neutral-200 text-neutral-700 hover:border-neutral-400 dark:border-neutral-700 dark:text-neutral-300 dark:hover:border-neutral-500"
            }`}
          >
            {CATEGORY_EMOJI[category] ?? ""} {category}
          </button>
        ))}
      </div>

      {visible.length > 0 ? (
        <div key={activeCategory ?? "__all"} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 animate-fadeIn">
          {visible.map((experience) => (
            <LocalExperienceCard key={experience.id} data={experience} />
          ))}
        </div>
      ) : (
        <p key="empty" className="text-center text-neutral-500 dark:text-neutral-400 animate-fadeIn">
          Nothing in this category yet — check back soon.
        </p>
      )}

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
