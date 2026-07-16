"use client";

import { Fragment, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/solid";
import ButtonPrimary from "@/components/ui/ButtonPrimary";
import BookingWidget from "./BookingWidget";
import type { ListingDetailViewModel } from "@/modules/listings/types";
import type { Route } from "@/routers/types";

/**
 * Mobile-only sticky booking bar (lg:hidden — BookingWidget's real sidebar
 * covers desktop, ListingDetailView.tsx). Replaces the old MobileFooterSticky/
 * ModalReserveMobile/checkout-PageMain chain, which showed a hardcoded fake
 * price and opened a demo checkout screen never wired to createShortTermBooking/
 * createLongTermBooking — mobile users could not actually book at all. This
 * renders the real BookingWidget (same component, same server actions) inside
 * a bottom-sheet instead of duplicating any booking logic.
 */
export default function MobileBookingBar({
  listingId,
  listingTitle,
  currency,
  maxOccupants,
  isAuthenticated,
  isOwner,
  pricing,
  blockedDates,
}: {
  listingId: string;
  listingTitle: string;
  currency: string;
  maxOccupants: number;
  isAuthenticated: boolean;
  isOwner: boolean;
  pricing: ListingDetailViewModel["pricing"];
  blockedDates: string[];
}) {
  const [isOpen, setIsOpen] = useState(false);

  const priceLabel =
    pricing.rentalType === "SHORT_TERM" ? `$${pricing.nightlyPrice}` : `$${pricing.monthlyRent}`;
  const priceUnit = pricing.rentalType === "SHORT_TERM" ? "/night" : "/month";

  return (
    // bottom-14 (not bottom-0): the site's global FooterNav (Explore/
    // Wishlists/Log in/Menu, src/app/layout.tsx) is also fixed at the
    // mobile viewport bottom, at a measured 56px tall — stacking directly
    // on bottom-0 here would overlap it instead of sitting above it.
    <div className="lg:hidden fixed bottom-14 inset-x-0 py-3 bg-white dark:bg-neutral-800 border-t border-neutral-200 dark:border-neutral-700 z-40">
      <div className="container flex items-center justify-between">
        <span className="text-lg font-semibold">
          {priceLabel}
          <span className="ml-1 text-sm font-normal text-neutral-500 dark:text-neutral-400">
            {priceUnit}
          </span>
        </span>

        {isOwner ? (
          <ButtonPrimary sizeClass="px-6 py-3 !rounded-2xl" href={`/add-listing/${listingId}` as Route}>
            Manage listing
          </ButtonPrimary>
        ) : (
          <ButtonPrimary sizeClass="px-6 py-3 !rounded-2xl" onClick={() => setIsOpen(true)}>
            {pricing.rentalType === "SHORT_TERM" && !pricing.instantBook ? "Request to book" : "Reserve"}
          </ButtonPrimary>
        )}
      </div>

      <Transition appear show={isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setIsOpen(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/40" />
          </Transition.Child>

          <div className="fixed inset-0 flex items-end">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="translate-y-full"
              enterTo="translate-y-0"
              leave="ease-in duration-200"
              leaveFrom="translate-y-0"
              leaveTo="translate-y-full"
            >
              <Dialog.Panel className="w-full max-h-[85vh] overflow-y-auto rounded-t-3xl bg-white dark:bg-neutral-900 p-6 pb-10">
                <div className="flex items-center justify-between mb-4">
                  <Dialog.Title className="text-lg font-semibold">{listingTitle}</Dialog.Title>
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>
                <BookingWidget
                  listingId={listingId}
                  currency={currency}
                  maxOccupants={maxOccupants}
                  isAuthenticated={isAuthenticated}
                  pricing={pricing}
                  blockedDates={blockedDates}
                />
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
}
