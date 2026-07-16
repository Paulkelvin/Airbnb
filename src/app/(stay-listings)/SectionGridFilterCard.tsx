import React, { FC } from "react";
import type { StayDataType } from "@/data/types";
import TabFilters from "./TabFilters";
import SortSelect from "./SortSelect";
import LoadMoreResults from "./LoadMoreResults";
import type { SortOption } from "@/lib/validations/search";

export interface SectionGridFilterCardProps {
  className?: string;
  items: StayDataType[];
  nextCursor: string | null;
  propertyTypes: { id: string; name: string; slug: string }[];
  amenities: { id: string; name: string; slug: string; category: string | null }[];
  appliedSort: SortOption;
  resultKey: string;
}

const AVAILABLE_SORTS: SortOption[] = ["newest", "price_asc", "price_desc", "rating"];

const SectionGridFilterCard: FC<SectionGridFilterCardProps> = ({
  className = "",
  items,
  nextCursor,
  propertyTypes,
  amenities,
  appliedSort,
  resultKey,
}) => {
  return (
    <div className={`nc-SectionGridFilterCard ${className}`} data-nc-id="SectionGridFilterCard">
      <div className="mb-8 lg:mb-11 flex flex-wrap items-center justify-between gap-4">
        <TabFilters propertyTypes={propertyTypes} amenities={amenities} />
        <SortSelect availableSorts={AVAILABLE_SORTS} />
      </div>

      {appliedSort === "relevance" && (
        <p className="mb-6 text-sm text-neutral-500">Sorted by relevance</p>
      )}

      {items.length === 0 ? (
        <p className="text-center text-neutral-500 py-16">
          No listings match your search. Try adjusting your filters.
        </p>
      ) : (
        <LoadMoreResults key={resultKey} initialItems={items} initialNextCursor={nextCursor} />
      )}
    </div>
  );
};

export default SectionGridFilterCard;
