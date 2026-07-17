import React, { FC } from "react";
import imagePng from "@/images/hero-right-new.png";
import HeroSearchForm from "../(client-components)/(HeroSearchForm)/HeroSearchForm";
import Image from "next/image";
import ButtonPrimary from "@/components/ui/ButtonPrimary";

export interface SectionHeroProps {
  className?: string;
}

const SectionHero: FC<SectionHeroProps> = ({ className = "" }) => {
  return (
    <div
      className={`nc-SectionHero flex flex-col-reverse lg:flex-col relative ${className}`}
    >
      <div className="flex flex-col lg:flex-row lg:items-center">
        <div className="flex-shrink-0 lg:w-1/2 flex flex-col items-start space-y-8 sm:space-y-10 pb-14 lg:pb-64 xl:pr-14 lg:mr-10 xl:mr-0">
          <h2 className="font-medium text-4xl md:text-5xl xl:text-7xl !leading-[114%] ">
            Your next great stay
          </h2>
          <span className="text-base md:text-lg text-neutral-500 dark:text-neutral-400">
            Short-term rentals and long-term leases, all verified. Browse
            thousands of properties and book in minutes.
          </span>
          <ButtonPrimary href="/listing-stay" sizeClass="px-5 py-4 sm:px-7">
            Search properties
          </ButtonPrimary>
        </div>
        <div className="flex-grow lg:pb-20 xl:pb-28">
          <Image
            className="w-full rounded-2xl"
            src={imagePng}
            alt="Luxury property interior"
            priority
          />
        </div>
      </div>

      <div className="hidden lg:block z-10 mb-12 lg:mb-0 lg:-mt-40 w-full">
        <HeroSearchForm />
      </div>
    </div>
  );
};

export default SectionHero;
