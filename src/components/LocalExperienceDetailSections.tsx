"use client";

import { Disclosure, Transition } from "@headlessui/react";
import { ChevronDownIcon } from "@heroicons/react/24/solid";
import type { LocalExperienceDetailSection } from "@/data/local-experiences";

export default function LocalExperienceDetailSections({
  sections,
}: {
  sections: LocalExperienceDetailSection[];
}) {
  if (sections.length === 0) return null;

  return (
    <div className="mt-12 max-w-3xl">
      <h2 className="text-xl font-semibold mb-3">Good to know</h2>
      <div className="rounded-3xl border border-neutral-200 dark:border-neutral-700 divide-y divide-neutral-200 dark:divide-neutral-700 overflow-hidden bg-white dark:bg-neutral-900 shadow-sm">
        {sections.map((section) => (
          <Disclosure key={section.heading}>
            {({ open }) => (
              <div>
                <Disclosure.Button className="flex w-full items-center justify-between gap-4 px-5 sm:px-6 py-4 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800/60 transition-colors">
                  <span className="font-medium text-neutral-900 dark:text-neutral-100">
                    {section.heading}
                  </span>
                  <ChevronDownIcon
                    className={`w-5 h-5 flex-shrink-0 text-neutral-400 transition-transform duration-200 ${
                      open ? "rotate-180 text-primary-600" : ""
                    }`}
                  />
                </Disclosure.Button>
                <Transition
                  enter="transition-all duration-200 ease-out"
                  enterFrom="opacity-0 max-h-0"
                  enterTo="opacity-100 max-h-[64rem]"
                  leave="transition-all duration-150 ease-in"
                  leaveFrom="opacity-100 max-h-[64rem]"
                  leaveTo="opacity-0 max-h-0"
                >
                  <Disclosure.Panel className="overflow-hidden px-5 sm:px-6 pb-5 text-neutral-600 dark:text-neutral-300 leading-relaxed whitespace-pre-line">
                    {section.body}
                  </Disclosure.Panel>
                </Transition>
              </div>
            )}
          </Disclosure>
        ))}
      </div>
    </div>
  );
}
