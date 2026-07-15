"use client";

import React, { FC, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import AnyReactComponent from "@/components/AnyReactComponent/AnyReactComponent";
import GoogleMapReact from "google-map-react";
import ButtonClose from "@/components/ui/ButtonClose";
import ButtonSecondary from "@/components/ui/ButtonSecondary";
import Checkbox from "@/components/ui/Checkbox";
import Heading from "@/components/ui/Heading";
import StayCard from "@/components/StayCard";
import TabFilters from "./TabFilters";
import SortSelect from "./SortSelect";
import { loadMoreListings } from "@/modules/listings/search-actions";
import type { StayDataType } from "@/data/types";
import type { SortOption } from "@/lib/validations/search";
import { buildSearchUrl } from "./searchParamsUtil";

export interface SectionGridHasMapProps {
  items: StayDataType[];
  nextCursor: string | null;
  propertyTypes: { id: string; name: string; slug: string }[];
  amenities: { id: string; name: string; slug: string; category: string | null }[];
  mapCenter: { lat: number; lng: number };
}

const AVAILABLE_SORTS: SortOption[] = ["newest", "price_asc", "price_desc", "rating", "distance"];

/** Rough km-per-degree-latitude conversion, good enough for a "search this area" radius estimate. */
function boundsToRadiusKm(bounds: { ne: { lat: number; lng: number }; sw: { lat: number; lng: number } }) {
  const dLat = Math.abs(bounds.ne.lat - bounds.sw.lat);
  return Math.max(1, Math.round((dLat * 111) / 2));
}

const SectionGridHasMap: FC<SectionGridHasMapProps> = ({
  items: initialItems,
  nextCursor: initialNextCursor,
  propertyTypes,
  amenities,
  mapCenter,
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [items, setItems] = useState(initialItems);
  const [nextCursor, setNextCursor] = useState(initialNextCursor);
  const [isPending, startTransition] = useTransition();
  const [currentHoverID, setCurrentHoverID] = useState<string | number>(-1);
  const [showFullMapFixed, setShowFullMapFixed] = useState(false);
  const [searchAsMoving, setSearchAsMoving] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  function handleLoadMore() {
    if (!nextCursor) return;
    startTransition(async () => {
      const params: Record<string, string> = {};
      searchParams.forEach((value, key) => {
        params[key] = value;
      });
      params.cursor = nextCursor;
      const result = await loadMoreListings(params);
      setItems((prev) => [...prev, ...result.items]);
      setNextCursor(result.nextCursor);
    });
  }

  function handleMapChange({
    center,
    bounds,
  }: {
    center: { lat: number; lng: number };
    bounds: { ne: { lat: number; lng: number }; sw: { lat: number; lng: number } };
  }) {
    if (!searchAsMoving) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      router.push(
        buildSearchUrl(pathname, searchParams, {
          lat: center.lat.toFixed(5),
          lng: center.lng.toFixed(5),
          radiusKm: boundsToRadiusKm(bounds),
        }) as never,
      );
    }, 600);
  }

  return (
    <div>
      <div className="relative flex min-h-screen">
        <div className="min-h-screen w-full xl:w-[60%] 2xl:w-[60%] max-w-[1184px] flex-shrink-0 xl:px-8 ">
          <Heading className="!mb-8" />
          <div className="mb-8 lg:mb-11 flex flex-wrap items-center justify-between gap-4">
            <TabFilters propertyTypes={propertyTypes} amenities={amenities} />
            <SortSelect availableSorts={AVAILABLE_SORTS} />
          </div>
          {items.length === 0 ? (
            <p className="text-center text-neutral-500 py-16">
              No listings match your search. Try adjusting your filters or moving the map.
            </p>
          ) : (
            <div
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-5 2xl:gap-x-6 gap-y-8"
              onMouseLeave={() => setCurrentHoverID(-1)}
            >
              {items.map((item) => (
                <div
                  key={item.id}
                  onMouseEnter={() => setCurrentHoverID(item.id)}
                >
                  <StayCard data={item} />
                </div>
              ))}
            </div>
          )}
          {nextCursor && (
            <div className="flex mt-16 justify-center items-center">
              <ButtonSecondary onClick={handleLoadMore} loading={isPending} disabled={isPending}>
                Show me more
              </ButtonSecondary>
            </div>
          )}
        </div>

        {!showFullMapFixed && (
          <div
            className="flex xl:hidden items-center justify-center fixed bottom-16 md:bottom-8 left-1/2 transform -translate-x-1/2 px-6 py-2 bg-neutral-900 text-white shadow-2xl rounded-full z-30 space-x-3 text-sm cursor-pointer"
            onClick={() => setShowFullMapFixed(true)}
          >
            <i className="text-lg las la-map"></i>
            <span>Show map</span>
          </div>
        )}

        <div
          className={`xl:flex-1 xl:static xl:block ${
            showFullMapFixed ? "fixed inset-0 z-50" : "hidden"
          }`}
        >
          {showFullMapFixed && (
            <ButtonClose
              onClick={() => setShowFullMapFixed(false)}
              className="bg-white absolute z-50 left-3 top-3 shadow-lg rounded-xl w-10 h-10"
            />
          )}

          <div className="fixed xl:sticky top-0 xl:top-[88px] left-0 w-full h-full xl:h-[calc(100vh-88px)] rounded-md overflow-hidden">
            <div className="absolute bottom-5 left-3 lg:bottom-auto lg:top-2.5 lg:left-1/2 transform lg:-translate-x-1/2 py-2 px-4 bg-white dark:bg-neutral-800 shadow-xl z-10 rounded-2xl min-w-max">
              <Checkbox
                className="text-xs xl:text-sm"
                name="searchAsMoving"
                label="Search as I move the map"
                defaultChecked={searchAsMoving}
                onChange={setSearchAsMoving}
              />
            </div>
            <GoogleMapReact
              defaultZoom={11}
              center={mapCenter}
              onChange={handleMapChange}
              bootstrapURLKeys={{
                key: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
              }}
              yesIWantToUseGoogleMapApiInternals
            >
              {items.map((item) => (
                <AnyReactComponent
                  isSelected={currentHoverID === item.id}
                  key={item.id}
                  lat={item.map.lat}
                  lng={item.map.lng}
                  listing={item}
                />
              ))}
            </GoogleMapReact>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SectionGridHasMap;
