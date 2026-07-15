"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Squares2X2Icon } from "@heroicons/react/24/outline";
import StartRating from "@/components/StartRating";
import Avatar from "@/components/ui/Avatar";
import Badge from "@/components/ui/Badge";
import ButtonPrimary from "@/components/ui/ButtonPrimary";
import ButtonSecondary from "@/components/ui/ButtonSecondary";
import ListingImageGallery from "@/components/listing-image-gallery/ListingImageGallery";
import BookingWidget from "./BookingWidget";
import InquiryForm from "./InquiryForm";
import FavoriteButton from "./FavoriteButton";
import ReviewsSection, { type ListingReview } from "./ReviewsSection";
import type { ListingDetailViewModel } from "@/modules/listings/types";
import type { Route } from "@/routers/types";

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
  isAuthenticated,
  blockedDates,
  reviews,
  isFavorited,
}: {
  listing: ListingDetailViewModel;
  isOwner: boolean;
  isAuthenticated: boolean;
  blockedDates: string[];
  reviews: ListingReview[];
  isFavorited: boolean;
}) {
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);

  const images = listing.images.length > 0 ? listing.images : [{ id: 0, url: "" }];
  const priceLabel =
    listing.pricing.rentalType === "SHORT_TERM"
      ? `$${listing.pricing.nightlyPrice}`
      : `$${listing.pricing.monthlyRent}`;
  const priceUnit = listing.pricing.rentalType === "SHORT_TERM" ? "/night" : "/month";

  return (
    <div className="nc-ListingStayDetailPage">
      {listing.status !== "PUBLISHED" && isOwner && (
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
        <div className="w-full lg:w-3/5 xl:w-2/3 space-y-8 lg:space-y-10 lg:pr-10">
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
            <div className="flex items-center justify-between xl:justify-start space-x-8 xl:space-x-12 text-sm text-neutral-700 dark:text-neutral-300">
              <div className="flex items-center space-x-3">
                <span>
                  {listing.maxOccupants} <span className="hidden sm:inline-block">guests</span>
                </span>
              </div>
              <div className="flex items-center space-x-3">
                <span>
                  {listing.bedrooms} <span className="hidden sm:inline-block">bedrooms</span>
                </span>
              </div>
              <div className="flex items-center space-x-3">
                <span>
                  {listing.bathrooms} <span className="hidden sm:inline-block">baths</span>
                </span>
              </div>
              {listing.sizeSqft && (
                <div className="flex items-center space-x-3">
                  <span>
                    {listing.sizeSqft} <span className="hidden sm:inline-block">sqft</span>
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* SECTION 2: DESCRIPTION */}
          <div className="listingSection__wrap">
            <h2 className="text-2xl font-semibold">About this place</h2>
            <div className="w-14 border-b border-neutral-200 dark:border-neutral-700" />
            <div className="text-neutral-6000 dark:text-neutral-300 whitespace-pre-line">
              {listing.description || "No description provided yet."}
            </div>
          </div>

          {/* SECTION 3: AMENITIES */}
          <div className="listingSection__wrap">
            <h2 className="text-2xl font-semibold">Amenities</h2>
            <div className="w-14 border-b border-neutral-200 dark:border-neutral-700" />
            {listing.amenities.length === 0 ? (
              <p className="text-neutral-500">No amenities listed.</p>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 text-sm text-neutral-700 dark:text-neutral-300">
                {listing.amenities.map((a) => (
                  <div key={a.id} className="flex items-center space-x-3">
                    <span>{a.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SECTION 4: PRICING DETAILS */}
          <div className="listingSection__wrap">
            <h2 className="text-2xl font-semibold">
              {listing.pricing.rentalType === "SHORT_TERM" ? "Rate details" : "Lease details"}
            </h2>
            <div className="w-14 border-b border-neutral-200 dark:border-neutral-700" />
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
            <div className="w-14 border-b border-neutral-200 dark:border-neutral-700" />
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
              <div className="w-14 border-b border-neutral-200 dark:border-neutral-700" />
              {listing.address.latitude && listing.address.longitude && (
                <div className="aspect-w-5 aspect-h-5 sm:aspect-h-3 ring-1 ring-black/10 rounded-xl z-0">
                  <div className="rounded-xl overflow-hidden z-0">
                    <iframe
                      width="100%"
                      height="100%"
                      loading="lazy"
                      allowFullScreen
                      referrerPolicy="no-referrer-when-downgrade"
                      src={`https://www.google.com/maps/embed/v1/place?key=${
                        process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""
                      }&q=${listing.address.latitude},${listing.address.longitude}`}
                    />
                  </div>
                </div>
              )}
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

              {isOwner ? (
                <ButtonPrimary href={`/add-listing/${listing.id}` as Route}>
                  Manage listing
                </ButtonPrimary>
              ) : (
                <BookingWidget
                  listingId={listing.id}
                  currency={listing.currency}
                  maxOccupants={listing.maxOccupants}
                  isAuthenticated={isAuthenticated}
                  pricing={listing.pricing}
                  blockedDates={blockedDates}
                />
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function Row({ label, value, shaded }: { label: string; value: string; shaded?: boolean }) {
  return (
    <div
      className={`p-4 flex justify-between items-center space-x-4 rounded-lg ${
        shaded ? "bg-neutral-100 dark:bg-neutral-800" : ""
      }`}
    >
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function titleCase(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
