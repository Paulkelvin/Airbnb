"use client";

import React, { Fragment, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Dialog, Popover, Transition } from "@headlessui/react";
import NcInputNumber from "@/components/NcInputNumber";
import ButtonPrimary from "@/components/ui/ButtonPrimary";
import ButtonThird from "@/components/ui/ButtonThird";
import ButtonClose from "@/components/ui/ButtonClose";
import Checkbox from "@/components/ui/Checkbox";
import Slider from "rc-slider";
import convertNumbThousand from "@/utils/convertNumbThousand";
import { buildSearchUrl } from "./searchParamsUtil";

export interface TabFiltersProps {
  propertyTypes: { id: string; name: string; slug: string }[];
  amenities: { id: string; name: string; slug: string; category: string | null }[];
}

const PRICE_MAX = 2000;

const TabFilters: React.FC<TabFiltersProps> = ({ propertyTypes, amenities }) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [isOpenMoreFilter, setIsOpenMoreFilter] = useState(false);
  const [isOpenMoreFilterMobile, setIsOpenMoreFilterMobile] = useState(false);

  const currentPropertyType = searchParams.get("propertyType") ?? "";
  const currentMinPrice = Number(searchParams.get("minPrice") ?? 0);
  const currentMaxPrice = Number(searchParams.get("maxPrice") ?? PRICE_MAX);
  const currentBedrooms = Number(searchParams.get("bedrooms") ?? 0);
  const currentBathrooms = Number(searchParams.get("bathrooms") ?? 0);
  const currentAmenities = new Set(
    (searchParams.get("amenities") ?? "").split(",").filter(Boolean),
  );

  const [rangePrices, setRangePrices] = useState([currentMinPrice, currentMaxPrice]);
  const [selectedPropertyType, setSelectedPropertyType] = useState(currentPropertyType);
  const [bedrooms, setBedrooms] = useState(currentBedrooms);
  const [bathrooms, setBathrooms] = useState(currentBathrooms);
  const [selectedAmenities, setSelectedAmenities] = useState<Set<string>>(currentAmenities);

  const activeFilterCount =
    (currentPropertyType ? 1 : 0) + currentAmenities.size + (currentBedrooms > 0 ? 1 : 0) + (currentBathrooms > 0 ? 1 : 0);

  function navigate(updates: Record<string, string | number | undefined | null>) {
    router.push(buildSearchUrl(pathname, searchParams, updates) as never);
  }

  function applyPropertyType(close: () => void) {
    navigate({ propertyType: selectedPropertyType || undefined });
    close();
  }

  function applyPrice(close: () => void) {
    navigate({
      minPrice: rangePrices[0] > 0 ? rangePrices[0] : undefined,
      maxPrice: rangePrices[1] < PRICE_MAX ? rangePrices[1] : undefined,
    });
    close();
  }

  function applyRooms(close: () => void) {
    navigate({
      bedrooms: bedrooms > 0 ? bedrooms : undefined,
      bathrooms: bathrooms > 0 ? bathrooms : undefined,
    });
    close();
  }

  function applyAmenities(close: () => void) {
    navigate({
      amenities: selectedAmenities.size > 0 ? Array.from(selectedAmenities).join(",") : undefined,
    });
    close();
  }

  function toggleAmenity(slug: string, checked: boolean) {
    setSelectedAmenities((prev) => {
      const next = new Set(prev);
      if (checked) next.add(slug);
      else next.delete(slug);
      return next;
    });
  }

  const renderXClear = (onClear: () => void) => (
    <span
      className="w-4 h-4 rounded-full bg-primary-500 text-white flex items-center justify-center ml-3 cursor-pointer"
      onClick={(e) => {
        e.stopPropagation();
        onClear();
      }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-3 w-3"
        viewBox="0 0 20 20"
        fill="currentColor"
      >
        <path
          fillRule="evenodd"
          d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
          clipRule="evenodd"
        />
      </svg>
    </span>
  );

  const renderTabPropertyType = () => (
    <Popover className="relative">
      {({ open, close }) => (
        <>
          <Popover.Button
            className={`flex items-center justify-center px-4 py-2 text-sm rounded-full border ${
              currentPropertyType
                ? "border-primary-500 bg-primary-50 text-primary-700"
                : "border-neutral-300 dark:border-neutral-700"
            } focus:outline-none`}
          >
            <span>
              {currentPropertyType
                ? propertyTypes.find((p) => p.slug === currentPropertyType)?.name ?? "Type of place"
                : "Type of place"}
            </span>
            {currentPropertyType ? (
              renderXClear(() => {
                setSelectedPropertyType("");
                navigate({ propertyType: undefined });
              })
            ) : (
              <i className="las la-angle-down ml-2" />
            )}
          </Popover.Button>
          <Transition
            as={Fragment}
            enter="transition ease-out duration-200"
            enterFrom="opacity-0 translate-y-1"
            enterTo="opacity-100 translate-y-0"
            leave="transition ease-in duration-150"
            leaveFrom="opacity-100 translate-y-0"
            leaveTo="opacity-0 translate-y-1"
          >
            <Popover.Panel className="absolute z-10 w-screen max-w-sm px-4 mt-3 left-0 sm:px-0 lg:max-w-md">
              <div className="overflow-hidden rounded-2xl shadow-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700">
                <div className="relative flex flex-col px-5 py-6 space-y-3 max-h-80 overflow-y-auto">
                  {propertyTypes.map((pt) => (
                    <Checkbox
                      key={pt.id}
                      name={pt.slug}
                      label={pt.name}
                      defaultChecked={selectedPropertyType === pt.slug}
                      onChange={(checked) => setSelectedPropertyType(checked ? pt.slug : "")}
                    />
                  ))}
                </div>
                <div className="p-5 bg-neutral-50 dark:bg-neutral-900 dark:border-t dark:border-neutral-800 flex items-center justify-between">
                  <ButtonThird
                    onClick={() => {
                      setSelectedPropertyType("");
                      navigate({ propertyType: undefined });
                      close();
                    }}
                    sizeClass="px-4 py-2 sm:px-5"
                  >
                    Clear
                  </ButtonThird>
                  <ButtonPrimary onClick={() => applyPropertyType(close)} sizeClass="px-4 py-2 sm:px-5">
                    Apply
                  </ButtonPrimary>
                </div>
              </div>
            </Popover.Panel>
          </Transition>
        </>
      )}
    </Popover>
  );

  const renderTabRooms = () => (
    <Popover className="relative">
      {({ open, close }) => (
        <>
          <Popover.Button
            className={`flex items-center justify-center px-4 py-2 text-sm rounded-full border border-neutral-300 dark:border-neutral-700 focus:outline-none`}
          >
            <span>Rooms</span>
            <i className="las la-angle-down ml-2" />
          </Popover.Button>
          <Transition
            as={Fragment}
            enter="transition ease-out duration-200"
            enterFrom="opacity-0 translate-y-1"
            enterTo="opacity-100 translate-y-0"
            leave="transition ease-in duration-150"
            leaveFrom="opacity-100 translate-y-0"
            leaveTo="opacity-0 translate-y-1"
          >
            <Popover.Panel className="absolute z-10 w-screen max-w-sm px-4 mt-3 left-0 sm:px-0 lg:max-w-md">
              <div className="overflow-hidden rounded-2xl shadow-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700">
                <div className="relative flex flex-col px-5 py-6 space-y-5">
                  <NcInputNumber label="Bedrooms" max={10} defaultValue={bedrooms} onChange={setBedrooms} />
                  <NcInputNumber label="Bathrooms" max={10} defaultValue={bathrooms} onChange={setBathrooms} />
                </div>
                <div className="p-5 bg-neutral-50 dark:bg-neutral-900 dark:border-t dark:border-neutral-800 flex items-center justify-between">
                  <ButtonThird
                    onClick={() => {
                      setBedrooms(0);
                      setBathrooms(0);
                      navigate({ bedrooms: undefined, bathrooms: undefined });
                      close();
                    }}
                    sizeClass="px-4 py-2 sm:px-5"
                  >
                    Clear
                  </ButtonThird>
                  <ButtonPrimary onClick={() => applyRooms(close)} sizeClass="px-4 py-2 sm:px-5">
                    Apply
                  </ButtonPrimary>
                </div>
              </div>
            </Popover.Panel>
          </Transition>
        </>
      )}
    </Popover>
  );

  const renderTabPriceRange = () => (
    <Popover className="relative">
      {({ close }) => (
        <>
          <Popover.Button
            className={`flex items-center justify-center px-4 py-2 text-sm rounded-full border border-primary-500 bg-primary-50 text-primary-700 focus:outline-none`}
          >
            <span>{`$${convertNumbThousand(rangePrices[0])} - $${convertNumbThousand(rangePrices[1])}`}</span>
          </Popover.Button>
          <Transition
            as={Fragment}
            enter="transition ease-out duration-200"
            enterFrom="opacity-0 translate-y-1"
            enterTo="opacity-100 translate-y-0"
            leave="transition ease-in duration-150"
            leaveFrom="opacity-100 translate-y-0"
            leaveTo="opacity-0 translate-y-1"
          >
            <Popover.Panel className="absolute z-10 w-screen max-w-sm px-4 mt-3 left-0 sm:px-0">
              <div className="overflow-hidden rounded-2xl shadow-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700">
                <div className="relative flex flex-col px-5 py-6 space-y-8">
                  <div className="space-y-5">
                    <span className="font-medium">Price range</span>
                    <Slider
                      range
                      className="text-red-400"
                      min={0}
                      max={PRICE_MAX}
                      value={rangePrices}
                      allowCross={false}
                      onChange={(e) => setRangePrices(e as number[])}
                    />
                  </div>
                  <div className="flex justify-between space-x-5 text-sm text-neutral-600 dark:text-neutral-300">
                    <span>${rangePrices[0]}</span>
                    <span>${rangePrices[1]}</span>
                  </div>
                </div>
                <div className="p-5 bg-neutral-50 dark:bg-neutral-900 dark:border-t dark:border-neutral-800 flex items-center justify-between">
                  <ButtonThird
                    onClick={() => {
                      setRangePrices([0, PRICE_MAX]);
                      navigate({ minPrice: undefined, maxPrice: undefined });
                      close();
                    }}
                    sizeClass="px-4 py-2 sm:px-5"
                  >
                    Clear
                  </ButtonThird>
                  <ButtonPrimary onClick={() => applyPrice(close)} sizeClass="px-4 py-2 sm:px-5">
                    Apply
                  </ButtonPrimary>
                </div>
              </div>
            </Popover.Panel>
          </Transition>
        </>
      )}
    </Popover>
  );

  const renderAmenitiesContent = () => (
    <div className="grid grid-cols-2 gap-5">
      {amenities.slice(0, 20).map((a) => (
        <Checkbox
          key={a.id}
          name={a.slug}
          label={a.name}
          defaultChecked={selectedAmenities.has(a.slug)}
          onChange={(checked) => toggleAmenity(a.slug, checked)}
        />
      ))}
    </div>
  );

  const renderTabMoreFilter = (mobile: boolean) => {
    const isOpen = mobile ? isOpenMoreFilterMobile : isOpenMoreFilter;
    const setOpen = mobile ? setIsOpenMoreFilterMobile : setIsOpenMoreFilter;

    return (
      <div>
        <div
          className={`${mobile ? "flex lg:hidden" : "flex"} items-center justify-center px-4 py-2 text-sm rounded-full border ${
            activeFilterCount > 0
              ? "border-primary-500 bg-primary-50 text-primary-700"
              : "border-neutral-300 dark:border-neutral-700"
          } focus:outline-none cursor-pointer`}
          onClick={() => setOpen(true)}
        >
          <span>Amenities{activeFilterCount > 0 ? ` (${selectedAmenities.size})` : ""}</span>
          {selectedAmenities.size > 0 &&
            renderXClear(() => {
              setSelectedAmenities(new Set());
              navigate({ amenities: undefined });
            })}
        </div>

        <Transition appear show={isOpen} as={Fragment}>
          <Dialog as="div" className="fixed inset-0 z-50 overflow-y-auto" onClose={() => setOpen(false)}>
            <div className="min-h-screen text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0"
                enterTo="opacity-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
              >
                <Dialog.Overlay className="fixed inset-0 bg-black bg-opacity-40 dark:bg-opacity-60" />
              </Transition.Child>
              <span className="inline-block h-screen align-middle" aria-hidden="true">
                &#8203;
              </span>
              <Transition.Child
                className="inline-block py-8 px-2 h-screen w-full max-w-2xl"
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <div className="inline-flex flex-col w-full max-w-2xl text-left align-middle transition-all transform overflow-hidden rounded-2xl bg-white dark:bg-neutral-900 dark:border dark:border-neutral-700 dark:text-neutral-100 shadow-xl h-full">
                  <div className="relative flex-shrink-0 px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 text-center">
                    <Dialog.Title as="h3" className="text-lg font-medium leading-6">
                      Amenities
                    </Dialog.Title>
                    <span className="absolute left-3 top-3">
                      <ButtonClose onClick={() => setOpen(false)} />
                    </span>
                  </div>
                  <div className="flex-grow overflow-y-auto px-10 py-7">{renderAmenitiesContent()}</div>
                  <div className="p-6 flex-shrink-0 bg-neutral-50 dark:bg-neutral-900 dark:border-t dark:border-neutral-800 flex items-center justify-between">
                    <ButtonThird
                      onClick={() => {
                        setSelectedAmenities(new Set());
                        navigate({ amenities: undefined });
                        setOpen(false);
                      }}
                      sizeClass="px-4 py-2 sm:px-5"
                    >
                      Clear
                    </ButtonThird>
                    <ButtonPrimary
                      onClick={() => applyAmenities(() => setOpen(false))}
                      sizeClass="px-4 py-2 sm:px-5"
                    >
                      Apply
                    </ButtonPrimary>
                  </div>
                </div>
              </Transition.Child>
            </div>
          </Dialog>
        </Transition>
      </div>
    );
  };

  return (
    <div className="flex flex-wrap gap-3 lg:gap-4">
      <div className="hidden lg:flex flex-wrap gap-4">
        {renderTabPropertyType()}
        {renderTabPriceRange()}
        {renderTabRooms()}
        {renderTabMoreFilter(false)}
      </div>
      {renderTabMoreFilter(true)}
    </div>
  );
};

export default TabFilters;
