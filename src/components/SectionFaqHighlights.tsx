"use client";

import React from "react";
import Link from "next/link";
import { Disclosure, Transition } from "@headlessui/react";
import { ChevronDownIcon } from "@heroicons/react/24/solid";
import { ArrowRightIcon } from "@heroicons/react/24/outline";
import Heading from "@/components/ui/Heading";
import type { FaqItem } from "@/app/faq/FaqAccordion";
import type { Route } from "@/routers/types";

const FAQ_HREF = "/faq" as Route;

/** Always surface the water-access disclosure on the homepage — trust-critical
 * for a waterfront-branded listing with no actual private water access — even
 * if it wouldn't otherwise make the cut on question order alone. */
const PINNED_QUESTION = "Does the Cottage Have Water Access?";

const SectionFaqHighlights: React.FC<{ faqs: FaqItem[] }> = ({ faqs }) => {
  const pinned = faqs.find((f) => f.question === PINNED_QUESTION);
  const rest = faqs.filter((f) => f.question !== PINNED_QUESTION);
  const highlighted = pinned ? [...rest.slice(0, 4), pinned] : rest.slice(0, 5);

  return (
    <div className="nc-SectionFaqHighlights">
      <div className="flex items-center justify-between">
        <Heading desc="Quick answers about booking, payments, and your stay">
          Common questions
        </Heading>
        <Link
          href={FAQ_HREF}
          className="hidden sm:inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full border border-neutral-200 dark:border-neutral-700 text-sm font-medium hover:border-neutral-400 dark:hover:border-neutral-500 transition-colors mb-10"
        >
          See more
          <ArrowRightIcon className="w-4 h-4" />
        </Link>
      </div>

      <div className="max-w-3xl mx-auto rounded-3xl border border-neutral-200 dark:border-neutral-700 divide-y divide-neutral-200 dark:divide-neutral-700 overflow-hidden bg-white dark:bg-neutral-900 shadow-sm">
        {highlighted.map((faq, i) => (
          <Disclosure key={faq.question}>
            {({ open }) => (
              <div>
                <Disclosure.Button className="flex w-full items-center gap-4 sm:gap-5 px-5 sm:px-6 py-5 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800/60 transition-colors">
                  <span className="flex-shrink-0 w-9 h-9 rounded-full bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 text-sm font-serif font-semibold flex items-center justify-center">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="flex-1 font-medium text-neutral-900 dark:text-neutral-100">
                    {faq.question}
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
                  enterTo="opacity-100 max-h-96"
                  leave="transition-all duration-150 ease-in"
                  leaveFrom="opacity-100 max-h-96"
                  leaveTo="opacity-0 max-h-0"
                >
                  <Disclosure.Panel className="overflow-hidden px-5 sm:px-6 pb-6 pl-[4.25rem] sm:pl-[4.75rem] text-neutral-600 dark:text-neutral-300 leading-relaxed">
                    {faq.answer}
                  </Disclosure.Panel>
                </Transition>
              </div>
            )}
          </Disclosure>
        ))}
      </div>

      <div className="flex sm:hidden justify-center mt-8">
        <Link
          href={FAQ_HREF}
          className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full border border-neutral-200 dark:border-neutral-700 text-sm font-medium hover:border-neutral-400 dark:hover:border-neutral-500 transition-colors"
        >
          See more
          <ArrowRightIcon className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
};

export default SectionFaqHighlights;
