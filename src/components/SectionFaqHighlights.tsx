"use client";

import React from "react";
import Link from "next/link";
import { Disclosure, Transition } from "@headlessui/react";
import { ChevronDownIcon } from "@heroicons/react/24/solid";
import { ArrowRightIcon } from "@heroicons/react/24/outline";
import Heading from "@/components/ui/Heading";
import { faqs } from "@/data/faqs";
import type { Route } from "@/routers/types";

const FAQ_HREF = "/faq" as Route;

const SectionFaqHighlights: React.FC = () => {
  const highlighted = faqs.slice(0, 5);

  return (
    <div className="nc-SectionFaqHighlights">
      <div className="flex items-center justify-between">
        <Heading desc="Quick answers about booking, payments, and hosting">
          Frequently asked questions
        </Heading>
        <Link
          href={FAQ_HREF}
          className="hidden sm:inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full border border-neutral-200 dark:border-neutral-700 text-sm font-medium hover:border-neutral-400 dark:hover:border-neutral-500 transition-colors mb-10"
        >
          See more
          <ArrowRightIcon className="w-4 h-4" />
        </Link>
      </div>

      <div className="max-w-3xl mx-auto space-y-3">
        {highlighted.map((faq) => (
          <Disclosure key={faq.question}>
            {({ open }) => (
              <div className="rounded-2xl border border-neutral-200 dark:border-neutral-700 overflow-hidden">
                <Disclosure.Button className="flex w-full items-center justify-between px-5 py-4 text-left font-medium text-neutral-900 dark:text-neutral-100 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">
                  <span>{faq.question}</span>
                  <ChevronDownIcon
                    className={`w-5 h-5 flex-shrink-0 text-neutral-500 transition-transform duration-200 ${
                      open ? "rotate-180" : ""
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
                  <Disclosure.Panel className="overflow-hidden px-5 pb-4 text-neutral-600 dark:text-neutral-300 leading-relaxed">
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
