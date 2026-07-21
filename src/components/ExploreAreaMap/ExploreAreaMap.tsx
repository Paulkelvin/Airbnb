"use client";

import React, { FC, Fragment, useState } from "react";
import GoogleMapReact from "google-map-react";
import { Transition } from "@headlessui/react";
import { CATEGORY_EMOJI, type LocalExperience } from "@/data/local-experiences";

interface CottageMarkerProps {
  lat: number;
  lng: number;
  label: string;
}

const CottageMarker: FC<CottageMarkerProps> = ({ label }) => (
  <div className="relative -translate-x-1/2 -translate-y-full flex flex-col items-center">
    <span className="px-2.5 py-1 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-semibold shadow-lg whitespace-nowrap">
      🏡 {label}
    </span>
    <span className="w-2 h-2 rounded-full bg-neutral-900 dark:bg-white -mt-0.5" />
  </div>
);

interface ExperienceMarkerProps {
  lat: number;
  lng: number;
  experience: LocalExperience;
}

const ExperienceMarker: FC<ExperienceMarkerProps> = ({ experience }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div
      className="relative -translate-x-1/2 -translate-y-full"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <span className="flex items-center justify-center w-8 h-8 rounded-full bg-white dark:bg-neutral-800 text-base shadow-lg ring-2 ring-primary-6000 cursor-default">
        {CATEGORY_EMOJI[experience.category] ?? "📍"}
      </span>
      <Transition
        show={isOpen}
        as={Fragment}
        enter="transition-opacity duration-100"
        enterFrom="opacity-0"
        enterTo="opacity-100"
        leave="transition-opacity duration-100"
        leaveFrom="opacity-100"
        leaveTo="opacity-0"
      >
        <div className="absolute z-10 bottom-full mb-2 left-1/2 -translate-x-1/2 w-max max-w-[200px] px-3 py-2 rounded-xl bg-white dark:bg-neutral-800 shadow-xl text-left">
          <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 line-clamp-1">
            {experience.title}
          </p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">{experience.distanceLabel}</p>
        </div>
      </Transition>
    </div>
  );
};

export interface ExploreAreaMapProps {
  className?: string;
  cottage: { lat: number; lng: number; label: string };
  experiences: LocalExperience[];
}

/**
 * Reuses google-map-react (already a dependency for the marketplace search
 * map, src/app/(stay-listings)/SectionGridHasMap.tsx) rather than pulling in
 * a second mapping library — just a different marker set: one cottage pin
 * plus one pin per experience that has coordinates.
 */
const ExploreAreaMap: FC<ExploreAreaMapProps> = ({ className = "", cottage, experiences }) => {
  const pinned = experiences.filter(
    (e): e is LocalExperience & { latitude: number; longitude: number } =>
      e.latitude !== null && e.longitude !== null,
  );

  if (!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) {
    return (
      <div
        className={`rounded-2xl overflow-hidden flex items-center justify-center bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 ${className}`}
      >
        <span className="text-sm">Map not available</span>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl overflow-hidden ${className}`}>
      <GoogleMapReact
        defaultZoom={12}
        center={{ lat: cottage.lat, lng: cottage.lng }}
        bootstrapURLKeys={{ key: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "" }}
        yesIWantToUseGoogleMapApiInternals
      >
        <CottageMarker lat={cottage.lat} lng={cottage.lng} label={cottage.label} />
        {pinned.map((experience) => (
          <ExperienceMarker
            key={experience.id}
            lat={experience.latitude}
            lng={experience.longitude}
            experience={experience}
          />
        ))}
      </GoogleMapReact>
    </div>
  );
};

export default ExploreAreaMap;
