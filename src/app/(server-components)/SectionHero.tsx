import React, { FC } from "react";
import CottageAvailabilityForm from "../(client-components)/(HeroSearchForm)/CottageAvailabilityForm";
import HeroImageCarousel from "@/components/HeroImageCarousel";
import ButtonPrimary from "@/components/ui/ButtonPrimary";
import type { Route } from "@/routers/types";

export interface SectionHeroProps {
  className?: string;
  /** The cottage's own listing page — null if there's no published listing yet. */
  listingHref: Route | null;
}

// Real photos of Potomac Vista Cottage (from the listing gallery) — a
// sunset hammock/fire-pit shot up front, then an aerial dusk view, the
// cottage itself from across the water, and a standalone sunset.
const HERO_IMAGES = [
  "https://res.cloudinary.com/lbwzvp5s/image/upload/v1784640961/listings/potomac-vista-cottage/hammock-firepit-sunset.jpg",
  "https://res.cloudinary.com/lbwzvp5s/image/upload/v1784640964/listings/potomac-vista-cottage/aerial-waterfront-dusk.jpg",
  "https://res.cloudinary.com/lbwzvp5s/image/upload/v1784642246/listings/potomac-vista-cottage/exterior-cottage-waterside.jpg",
  "https://res.cloudinary.com/lbwzvp5s/image/upload/v1784642254/listings/potomac-vista-cottage/sunset-over-water.jpg",
];

const SectionHero: FC<SectionHeroProps> = ({ className = "", listingHref }) => {
  return (
    <div
      className={`nc-SectionHero flex flex-col-reverse lg:flex-col relative ${className}`}
    >
      <div className="flex flex-col lg:flex-row lg:items-center">
        <div className="flex-shrink-0 lg:w-1/2 flex flex-col items-start space-y-8 sm:space-y-10 pb-14 lg:pb-20 xl:pb-28 xl:pr-14 lg:mr-10 xl:mr-0">
          <h1 className="font-medium text-4xl md:text-5xl xl:text-7xl !leading-[114%] ">
            Potomac Vista Cottage
          </h1>
          <span className="text-base md:text-lg text-neutral-500 dark:text-neutral-400">
            A peaceful, private retreat with sweeping Potomac River views, just
            minutes from Leonardtown's restaurants, shops, and public water access.
            It does not have a private beach, dock, or pier on site, but nearby
            launches, beaches, and dining put everything you need within easy reach.
          </span>
          {listingHref && (
            <ButtonPrimary href={listingHref} sizeClass="px-5 py-4 sm:px-7">
              Book Your Stay
            </ButtonPrimary>
          )}
        </div>
        <div className="flex-grow lg:pb-20 xl:pb-28">
          <HeroImageCarousel images={HERO_IMAGES} />
        </div>
      </div>

      {listingHref && (
        <div className="hidden lg:block z-10 mb-12 lg:mb-0 lg:-mt-24 w-full">
          <CottageAvailabilityForm listingHref={listingHref} />
        </div>
      )}
    </div>
  );
};

export default SectionHero;
