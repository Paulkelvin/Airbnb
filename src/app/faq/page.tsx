"use client";

import React from "react";
import { Disclosure, Transition } from "@headlessui/react";
import { ChevronDownIcon } from "@heroicons/react/24/solid";
import BgGlassmorphism from "@/components/BgGlassmorphism";
import Link from "next/link";
import { faqs } from "@/data/faqs";

const CATEGORIES = Array.from(new Set(faqs.map((f) => f.category)));

const FaqPage: React.FC = () => {
  return (
    <div className="nc-FaqPage overflow-hidden relative">
      <BgGlassmorphism />
      <div className="container relative py-16 lg:py-28">
        <h2 className="text-3xl md:text-4xl font-semibold">
          Frequently asked questions
        </h2>
        <span className="block mt-3 text-neutral-500 dark:text-neutral-400 text-lg">
          Everything you need to know about booking, hosting, and staying with Potomac.
        </span>
        <div className="w-14 border-b border-neutral-200 dark:border-neutral-700 mt-6 mb-10" />

        <div className="max-w-3xl space-y-10">
          {CATEGORIES.map((category) => (
            <div key={category}>
              <h3 className="text-lg font-semibold text-primary-600 mb-3">
                {category}
              </h3>
              <div className="space-y-3">
                {faqs
                  .filter((f) => f.category === category)
                  .map((faq) => (
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
            </div>
          ))}
        </div>

        <div className="max-w-3xl mt-14 rounded-2xl bg-neutral-50 dark:bg-neutral-800 px-6 py-8 text-center">
          <h3 className="text-lg font-semibold">Still have questions?</h3>
          <p className="mt-2 text-neutral-500 dark:text-neutral-400">
            Our support team is here around the clock.
          </p>
          <Link
            href="/contact"
            className="mt-4 inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-primary-6000 text-white text-sm font-medium hover:bg-primary-700 transition-colors"
          >
            Contact support
          </Link>
        </div>
      </div>
    </div>
  );
};

export default FaqPage;
