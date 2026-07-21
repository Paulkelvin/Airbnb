"use client";

import React, { useState } from "react";
import Image from "next/image";
import {
  Squares2X2Icon,
  CheckIcon,
  ChevronDownIcon,
  UsersIcon,
  HomeModernIcon,
} from "@heroicons/react/24/outline";
import StartRating from "@/components/StartRating";
import Avatar from "@/components/ui/Avatar";
import Badge from "@/components/ui/Badge";
import ButtonPrimary from "@/components/ui/ButtonPrimary";
import ButtonSecondary from "@/components/ui/ButtonSecondary";
import ListingImageGallery from "@/components/listing-image-gallery/ListingImageGallery";
import BookingWidget from "./BookingWidget";
import MobileBookingBar from "./MobileBookingBar";
import InquiryForm from "./InquiryForm";
import FavoriteButton from "./FavoriteButton";
import ReviewsSection, { type ListingReview } from "./ReviewsSection";
import LocalExperienceCard from "@/components/LocalExperienceCard";
import Link from "next/link";
import type { ListingDetailViewModel } from "@/modules/listings/types";
import type { LocalExperience } from "@/data/local-experiences";
import type { Route } from "@/routers/types";
import { cloudinaryLoader } from "@/lib/cloudinary-image-loader";

const AMENITY_CATEGORY_LABELS: Record<string, string> = {
  BASIC: "Basic",
  SAFETY: "Safety",
  OUTDOOR: "Outdoor",
  KITCHEN: "Kitchen",
  ENTERTAINMENT: "Entertainment",
  ACCESSIBILITY: "Accessibility",
  PARKING: "Parking",
  CLIMATE: "Climate",
};

export default function ListingDetailView({
  listing,
  isOwner,
  isAdmin,
  isAuthenticated,
  blockedDates,
  reviews,
  isFavorited,
  serviceFeePercent,
  experiences,
}: {
  listing: ListingDetailViewModel;
  isOwner: boolean;
  /**
   * Marketplace mode is off: only ADMIN may manage listings, so the "Manage
   * listing" / "Continue editing" CTAs are gated on this rather than
   * `isOwner`. `isOwner` itself stays as the plain hostId match — it still
   * legitimately drives unrelated things like hiding the inquiry form and
   * showing host-response controls on reviews.
   */
  isAdmin: boolean;
  isAuthenticated: boolean;
  blockedDates: string[];
  reviews: ListingReview[];
  isFavorited: boolean;
  serviceFeePercent: number;
  experiences: LocalExperience[];
}) {
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [showAllAmenities, setShowAllAmenities] = useState(false);

  const AMENITIES_PREVIEW_COUNT = 8;
  const visibleAmenities = showAllAmenities
    ? listing.amenities
    : listing.amenities.slice(0, AMENITIES_PREVIEW_COUNT);
  const amenitiesByCategory = visibleAmenities.reduce<Record<string, typeof listing.amenities>>(
    (acc, a) => {
      const key = a.category ?? "OTHER";
      (acc[key] ??= []).push(a);
      return acc;
    },
    {},
  );

  const images = listing.images.length > 0 ? listing.images : [{ id: 0, url: "" }];
  const priceLabel =
    listing.pricing.rentalType === "SHORT_TERM"
      ? `$${listing.pricing.nightlyPrice}`
      : `$${listing.pricing.monthlyRent}`;
  const priceUnit = listing.pricing.rentalType === "SHORT_TERM" ? "/night" : "/month";

  return (
    <div className="nc-ListingStayDetailPage pb-36 lg:pb-0">
      {listing.status !== "PUBLISHED" && isAdmin && (
        <div className="mb-6 rounded-xl bg-yellow-50 text-yellow-800 px-4 py-3 text-sm">
          This listing is <strong>{listing.status.replace("_", " ").toLowerCase()}</strong> and
          only visible to you.{" "}
          <a href={`/add-listing/${listing.id}` as Route} className="underline font-medium">
            Continue editing
          </a>
        </div>
      )}

      <ListingImageGallery
        isShowModal={isGalleryOpen}
        onClose={() => setIsGalleryOpen(false)}
        images={images}
        listingId={listing.id}
        isAuthenticated={isAuthenticated}
        isFavorited={isFavorited}
      />

      {/* HEADER */}
      <header className="rounded-md sm:rounded-xl">
        <div className="relative grid grid-cols-3 sm:grid-cols-4 gap-1 sm:gap-2">
          <div
            className="col-span-2 row-span-3 sm:row-span-2 relative rounded-md sm:rounded-xl overflow-hidden cursor-pointer bg-neutral-100 aspect-[4/3]"
            onClick={() => setIsGalleryOpen(true)}
          >
            {images[0]?.url && (
              <Image
                fill
                loader={cloudinaryLoader}
                className="object-cover rounded-md sm:rounded-xl"
                src={images[0].url}
                alt={listing.title}
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 50vw"
              />
            )}
            <div className="absolute inset-0 bg-neutral-900 bg-opacity-20 opacity-0 hover:opacity-100 transition-opacity" />
          </div>
          {images.slice(1, 5).map((img, index) => (
            <div
              key={img.id}
              className={`relative rounded-md sm:rounded-xl overflow-hidden bg-neutral-100 ${
                index >= 3 ? "hidden sm:block" : ""
              }`}
            >
              <div className="aspect-w-4 aspect-h-3 sm:aspect-w-6 sm:aspect-h-5">
                {img.url && (
                  <Image
                    fill
                    loader={cloudinaryLoader}
                    className="object-cover rounded-md sm:rounded-xl"
                    src={img.url}
                    alt=""
                    sizes="400px"
                  />
                )}
              </div>
              <div
                className="absolute inset-0 bg-neutral-900 bg-opacity-20 opacity-0 hover:opacity-100 transition-opacity cursor-pointer"
                onClick={() => setIsGalleryOpen(true)}
              />
            </div>
          ))}
          {listing.images.length > 0 && (
            <button
              className="absolute hidden md:flex md:items-center md:justify-center left-3 bottom-3 px-4 py-2 rounded-xl bg-neutral-100 text-neutral-500 hover:bg-neutral-200 z-10"
              onClick={() => setIsGalleryOpen(true)}
            >
              <Squares2X2Icon className="w-5 h-5" />
              <span className="ml-2 text-neutral-800 text-sm font-medium">Show all photos</span>
            </button>
          )}
        </div>
      </header>

      {/* MAIN */}
      <main className="relative z-10 mt-11 flex flex-col lg:flex-row">
        <div className="w-full lg:w-3/5 xl:w-2/3 space-y-7 lg:space-y-8 lg:pr-10">
          {/* SECTION 1 */}
          <div className="listingSection__wrap !space-y-6">
            <div className="flex justify-between items-center">
              <Badge name={listing.propertyType.name} />
              <FavoriteButton
                listingId={listing.id}
                isAuthenticated={isAuthenticated}
                initiallyFavorited={isFavorited}
              />
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-semibold">{listing.title}</h2>
            <div className="flex items-center space-x-4">
              <StartRating point={listing.avgRating} reviewCount={listing.reviewCount} />
              {listing.address && (
                <>
                  <span>·</span>
                  <span>
                    {listing.address.city}, {listing.address.country}
                  </span>
                </>
              )}
            </div>
            <div className="flex items-center">
              <Avatar
                imgUrl={listing.host.avatarUrl ?? undefined}
                sizeClass="h-10 w-10"
                radius="rounded-full"
              />
              <span className="ml-2.5 text-neutral-500 dark:text-neutral-400">
                Hosted by{" "}
                <span className="text-neutral-900 dark:text-neutral-200 font-medium">
                  {listing.host.name}
                </span>
              </span>
            </div>
            <div className="w-full border-b border-neutral-100 dark:border-neutral-700" />
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-neutral-700 dark:text-neutral-300">
              <div className="flex items-center gap-1.5">
                <UsersIcon className="w-4 h-4 text-neutral-400 flex-shrink-0" />
                <span>
                  {listing.maxOccupants} guest{listing.maxOccupants !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <HomeModernIcon className="w-4 h-4 text-neutral-400 flex-shrink-0" />
                <span>
                  {listing.bedrooms} bedroom{listing.bedrooms !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span>
                  {listing.bathrooms} bath{listing.bathrooms !== 1 ? "s" : ""}
                </span>
              </div>
              {listing.sizeSqft && (
                <div className="flex items-center gap-1.5">
                  <span>{listing.sizeSqft} sqft</span>
                </div>
              )}
            </div>
          </div>

          {/* SECTION 2: DESCRIPTION */}
          <div className="listingSection__wrap">
            <h2 className="text-2xl font-semibold">About this place</h2>
            <div className="text-neutral-6000 dark:text-neutral-300 whitespace-pre-line">
              {listing.description || "No description provided yet."}
            </div>
          </div>

          {/* SECTION 3: AMENITIES */}
          <div className="listingSection__wrap !space-y-4">
            <h2 className="text-2xl font-semibold">
              What this place offers
              <span className="ml-2 text-base font-normal text-neutral-400">
                ({listing.amenities.length})
              </span>
            </h2>
            {listing.amenities.length === 0 ? (
              <p className="text-neutral-500">No amenities listed.</p>
            ) : (
              <>
                <div className="space-y-5">
                  {Object.entries(amenitiesByCategory).map(([category, items]) => (
                    <div key={category}>
                      <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-400 mb-2.5">
                        {AMENITY_CATEGORY_LABELS[category] ?? category}
                      </h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2.5 text-sm text-neutral-700 dark:text-neutral-300">
                        {items.map((a) => (
                          <div key={a.id} className="flex items-center gap-2 min-w-0">
                            <CheckIcon className="w-4 h-4 flex-shrink-0 text-neutral-400" />
                            <span className="truncate">{a.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                {listing.amenities.length > AMENITIES_PREVIEW_COUNT && (
                  <button
                    onClick={() => setShowAllAmenities((v) => !v)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 text-sm font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                  >
                    {showAllAmenities ? "Show less" : `Show all ${listing.amenities.length} amenities`}
                    <ChevronDownIcon
                      className={`w-4 h-4 transition-transform ${showAllAmenities ? "rotate-180" : ""}`}
                    />
                  </button>
                )}
              </>
            )}
          </div>

          {/* SECTION 4: PRICING DETAILS */}
          <div className="listingSection__wrap">
            <h2 className="text-2xl font-semibold">
              {listing.pricing.rentalType === "SHORT_TERM" ? "Rate details" : "Lease details"}
            </h2>
            <div className="flow-root">
              <div className="text-sm sm:text-base text-neutral-6000 dark:text-neutral-300 -mb-4">
                {listing.pricing.rentalType === "SHORT_TERM" ? (
                  <>
                    <Row label="Nightly rate" value={`$${listing.pricing.nightlyPrice}`} shaded />
                    {listing.pricing.cleaningFee !== null && (
                      <Row label="Cleaning fee" value={`$${listing.pricing.cleaningFee}`} />
                    )}
                    <Row
                      label="Minimum nights"
                      value={`${listing.pricing.minNights}`}
                      shaded
                    />
                    {listing.pricing.maxNights && (
                      <Row label="Maximum nights" value={`${listing.pricing.maxNights}`} />
                    )}
                    <Row
                      label="Cancellation policy"
                      value={titleCase(listing.pricing.cancellationPolicy)}
                      shaded
                    />
                    <Row
                      label="Check-in"
                      value={
                        listing.pricing.checkInTime
                          ? formatTime(listing.pricing.checkInTime)
                          : "Flexible"
                      }
                    />
                    <Row
                      label="Check-out"
                      value={
                        listing.pricing.checkOutTime
                          ? formatTime(listing.pricing.checkOutTime)
                          : "Flexible"
                      }
                      shaded
                    />
                  </>
                ) : (
                  <>
                    <Row label="Monthly rent" value={`$${listing.pricing.monthlyRent}`} shaded />
                    {listing.pricing.securityDeposit !== null && (
                      <Row
                        label="Security deposit"
                        value={`$${listing.pricing.securityDeposit}`}
                      />
                    )}
                    <Row
                      label="Minimum lease"
                      value={`${listing.pricing.minLeaseTermMonths} months`}
                      shaded
                    />
                    <Row
                      label="Pet policy"
                      value={titleCase(listing.pricing.petPolicy)}
                    />
                    <Row
                      label="Utilities included"
                      value={listing.pricing.utilitiesIncluded ? "Yes" : "No"}
                      shaded
                    />
                  </>
                )}
              </div>
            </div>
          </div>

          {/* SECTION 5: HOST */}
          <div className="listingSection__wrap">
            <h2 className="text-2xl font-semibold">Host information</h2>
            <div className="flex items-center space-x-4">
              <Avatar
                imgUrl={listing.host.avatarUrl ?? undefined}
                sizeClass="h-14 w-14"
                radius="rounded-full"
              />
              <div>
                <span className="block text-xl font-medium">{listing.host.name}</span>
              </div>
            </div>
            {!isOwner && (
              <div className="pt-2">
                <InquiryForm listingId={listing.id} isAuthenticated={isAuthenticated} />
              </div>
            )}
          </div>

          {/* SECTION 6: REVIEWS */}
          <ReviewsSection
            reviews={reviews}
            avgRating={listing.avgRating}
            reviewCount={listing.reviewCount}
            isOwner={isOwner}
          />

          {/* SECTION 7: LOCATION */}
          {listing.address && (
            <div className="listingSection__wrap">
              <h2 className="text-2xl font-semibold">Location</h2>
              <span className="block mt-2 text-neutral-500 dark:text-neutral-400">
                {listing.address.city}, {listing.address.region}, {listing.address.country}
              </span>
              {listing.address.latitude && listing.address.longitude && (
                <div className="aspect-w-5 aspect-h-5 sm:aspect-h-3 ring-1 ring-black/10 rounded-xl z-0">
                  <div className="rounded-xl overflow-hidden z-0">
                    {process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ? (
                      <iframe
                        width="100%"
                        height="100%"
                        loading="lazy"
                        allowFullScreen
                        referrerPolicy="no-referrer-when-downgrade"
                        src={`https://www.google.com/maps/embed/v1/place?key=${
                          process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
                        }&q=${listing.address.latitude},${listing.address.longitude}`}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400">
                        <div className="text-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto mb-2 text-neutral-400 dark:text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span className="text-sm">Map not available</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SECTION 8: THINGS TO DO NEARBY */}
          {experiences.length > 0 && (
            <div className="listingSection__wrap">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-semibold">Make the Most of Your Stay</h2>
                <Link
                  href={"/explore-the-area" as Route}
                  className="text-sm font-medium text-primary-6000 hover:text-primary-700"
                >
                  See more
                </Link>
              </div>
              <span className="block mt-2 text-neutral-500 dark:text-neutral-400">
                Although this listing doesn't have private waterfront access, some of the area's
                best waterfront parks, restaurants, and attractions are only minutes away.
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
                {experiences.slice(0, 3).map((experience) => (
                  <LocalExperienceCard key={experience.id} data={experience} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* SIDEBAR */}
        <div className="hidden lg:block flex-grow mt-14 lg:mt-0">
          <div className="sticky top-28">
            <div className="listingSectionSidebar__wrap shadow-xl">
              <div className="flex justify-between">
                <span className="text-3xl font-semibold">
                  {priceLabel}
                  <span className="ml-1 text-base font-normal text-neutral-500 dark:text-neutral-400">
                    {priceUnit}
                  </span>
                </span>
                <StartRating point={listing.avgRating} reviewCount={listing.reviewCount} />
              </div>

              {isAdmin ? (
                <ButtonPrimary href={`/add-listing/${listing.id}` as Route}>
                  Manage listing
                </ButtonPrimary>
              ) : listing.status !== "PUBLISHED" ? (
                <p className="text-center text-sm text-neutral-500 dark:text-neutral-400">
                  This listing isn&apos;t published yet, so it can&apos;t be booked.
                </p>
              ) : (
                <BookingWidget
                  listingId={listing.id}
                  currency={listing.currency}
                  maxOccupants={listing.maxOccupants}
                  isAuthenticated={isAuthenticated}
                  pricing={listing.pricing}
                  blockedDates={blockedDates}
                  serviceFeePercent={serviceFeePercent}
                />
              )}
            </div>
          </div>
        </div>
      </main>

      <MobileBookingBar
        listingId={listing.id}
        listingTitle={listing.title}
        currency={listing.currency}
        maxOccupants={listing.maxOccupants}
        isAuthenticated={isAuthenticated}
        canManage={isAdmin}
        isPublished={listing.status === "PUBLISHED"}
        pricing={listing.pricing}
        blockedDates={blockedDates}
        serviceFeePercent={serviceFeePercent}
      />
    </div>
  );
}

function Row({ label, value, shaded }: { label: string; value: string; shaded?: boolean }) {
  return (
    <div
      className={`px-4 py-3 flex justify-between items-center space-x-4 rounded-lg text-sm ${
        shaded ? "bg-neutral-100 dark:bg-neutral-800" : ""
      }`}
    >
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function formatTime(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hour12}:${String(minutes).padStart(2, "0")} ${period}`;
}

function titleCase(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
