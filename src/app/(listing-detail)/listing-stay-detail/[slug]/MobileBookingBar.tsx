"use client";

import { Fragment, useCallback, useRef, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/solid";
import ButtonPrimary from "@/components/ui/ButtonPrimary";
import BookingWidget from "./BookingWidget";
import type { ListingDetailViewModel } from "@/modules/listings/types";
import type { Route } from "@/routers/types";

const DISMISS_THRESHOLD = 120;

export default function MobileBookingBar({
  listingId,
  listingTitle,
  currency,
  maxOccupants,
  isAuthenticated,
  canManage,
  isPublished,
  pricing,
  blockedDates,
  serviceFeePercent,
}: {
  listingId: string;
  listingTitle: string;
  currency: string;
  maxOccupants: number;
  isAuthenticated: boolean;
  canManage: boolean;
  isPublished: boolean;
  pricing: ListingDetailViewModel["pricing"];
  blockedDates: string[];
  serviceFeePercent: number;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartY = useRef(0);
  const panelRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const panel = panelRef.current;
    if (panel && panel.scrollTop > 0) return;
    dragStartY.current = e.touches[0].clientY;
    setIsDragging(true);
  }, []);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isDragging) return;
      const delta = e.touches[0].clientY - dragStartY.current;
      if (delta < 0) {
        setDragY(0);
        return;
      }
      setDragY(delta);
    },
    [isDragging],
  );

  const handleTouchEnd = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);
    if (dragY > DISMISS_THRESHOLD) {
      setIsOpen(false);
    }
    setDragY(0);
  }, [isDragging, dragY]);

  const priceLabel =
    pricing.rentalType === "SHORT_TERM" ? `$${pricing.nightlyPrice}` : `$${pricing.monthlyRent}`;
  const priceUnit = pricing.rentalType === "SHORT_TERM" ? "/night" : "/month";

  return (
    <div className={`lg:hidden fixed bottom-0 inset-x-0 py-3 bg-white dark:bg-neutral-800 border-t border-neutral-200 dark:border-neutral-700 z-40 transition-opacity duration-200 ${isOpen ? "opacity-0 pointer-events-none" : "opacity-100"}`}>
      <div className="container flex items-center justify-between">
        <span className="text-lg font-semibold">
          {priceLabel}
          <span className="ml-1 text-sm font-normal text-neutral-500 dark:text-neutral-400">
            {priceUnit}
          </span>
        </span>

        {canManage ? (
          <ButtonPrimary sizeClass="px-6 py-3 !rounded-2xl" href={`/add-listing/${listingId}` as Route}>
            Manage listing
          </ButtonPrimary>
        ) : !isPublished ? (
          <span className="text-sm text-neutral-500 dark:text-neutral-400">Not published yet</span>
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
              <Dialog.Panel
                ref={panelRef}
                className="w-full max-h-[85vh] overflow-y-auto rounded-t-3xl bg-white dark:bg-neutral-900 p-6 pb-10"
                style={{
                  transform: dragY > 0 ? `translateY(${dragY}px)` : undefined,
                  transition: isDragging ? "none" : "transform 300ms ease-out",
                  opacity: dragY > 0 ? Math.max(0.4, 1 - dragY / 400) : undefined,
                }}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                <div className="w-10 h-1 rounded-full bg-neutral-300 dark:bg-neutral-600 mx-auto mb-4" />
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
                  serviceFeePercent={serviceFeePercent}
                />
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
}
