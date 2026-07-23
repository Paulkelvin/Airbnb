"use client";

import { Fragment } from "react";
import { Popover, Transition } from "@headlessui/react";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import { toast } from "sonner";
import NcInputNumber from "@/components/NcInputNumber";

const GUEST_CAP = 6;

export interface GuestBreakdown {
  adults: number;
  children: number;
  infants: number;
  pets: number;
}

interface GuestSelectorProps {
  maxOccupants: number;
  petsAllowed: boolean;
  value: GuestBreakdown;
  onChange: (value: GuestBreakdown) => void;
}

export default function GuestSelector({
  maxOccupants,
  petsAllowed,
  value,
  onChange,
}: GuestSelectorProps) {
  const effectiveMax = Math.min(maxOccupants, GUEST_CAP);
  const occupants = value.adults + value.children;

  const handleMaxReached = () => {
    toast.error(`Maximum ${GUEST_CAP} guests allowed at this property`);
  };

  const summaryParts = [`${occupants} guest${occupants !== 1 ? "s" : ""}`];
  if (value.infants > 0) {
    summaryParts.push(`${value.infants} infant${value.infants !== 1 ? "s" : ""}`);
  }
  if (value.pets > 0) {
    summaryParts.push(`${value.pets} pet${value.pets !== 1 ? "s" : ""}`);
  }

  return (
    <Popover className="relative">
      {({ open }) => (
        <>
          <Popover.Button className="w-full flex items-center justify-between text-left text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg px-3 py-2 focus:outline-none">
            <span>
              <span className="block text-xs font-medium text-neutral-500 -mb-0.5">Guests</span>
              {summaryParts.join(", ")}
            </span>
            <ChevronDownIcon
              className={`w-4 h-4 text-neutral-400 transition-transform ${open ? "rotate-180" : ""}`}
            />
          </Popover.Button>

          <Transition
            as={Fragment}
            enter="transition ease-out duration-150"
            enterFrom="opacity-0 translate-y-1"
            enterTo="opacity-100 translate-y-0"
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100 translate-y-0"
            leaveTo="opacity-0 translate-y-1"
          >
            <Popover.Panel className="absolute left-0 right-0 z-20 mt-2 p-5 bg-white dark:bg-neutral-800 rounded-3xl shadow-xl border border-neutral-200 dark:border-neutral-700">
              <NcInputNumber
                label="Adults"
                desc="Ages 13 or above"
                defaultValue={value.adults}
                min={1}
                max={effectiveMax - value.children}
                onChange={(adults) => onChange({ ...value, adults })}
                onAttemptExceedMax={handleMaxReached}
              />
              <NcInputNumber
                className="mt-5 w-full"
                label="Children"
                desc="Ages 2–12"
                defaultValue={value.children}
                max={effectiveMax - value.adults}
                onChange={(children) => onChange({ ...value, children })}
                onAttemptExceedMax={handleMaxReached}
              />
              <NcInputNumber
                className="mt-5 w-full"
                label="Infants"
                desc="Under 2"
                defaultValue={value.infants}
                max={4}
                onChange={(infants) => onChange({ ...value, infants })}
              />
              {petsAllowed && (
                <NcInputNumber
                  className="mt-5 w-full"
                  label="Pets"
                  desc="Bringing a service animal?"
                  defaultValue={value.pets}
                  max={2}
                  onChange={(pets) => onChange({ ...value, pets })}
                />
              )}
              <p className="mt-5 text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
                This place has a maximum of {effectiveMax} guests, not including infants.
                {petsAllowed && " If you're bringing more than 2 pets, please let your host know."}
              </p>
            </Popover.Panel>
          </Transition>
        </>
      )}
    </Popover>
  );
}
