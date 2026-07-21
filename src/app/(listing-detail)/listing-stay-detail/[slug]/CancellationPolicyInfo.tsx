"use client";

import { Fragment, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { describeCancellationPolicy } from "@/lib/pricing-policy";
import type { CancellationPolicy } from "@prisma/client";

function titleCase(value: string) {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

export default function CancellationPolicyInfo({ policy }: { policy: CancellationPolicy }) {
  const [isOpen, setIsOpen] = useState(false);
  const tiers = describeCancellationPolicy(policy);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="underline decoration-dotted underline-offset-2 hover:text-neutral-900 dark:hover:text-white"
      >
        {titleCase(policy)}
      </button>

      <Transition appear show={isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setIsOpen(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/40" />
          </Transition.Child>

          <div className="fixed inset-0 flex items-end sm:items-center justify-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="w-full sm:max-w-sm bg-white dark:bg-neutral-900 rounded-t-3xl sm:rounded-3xl p-6 shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <Dialog.Title className="text-lg font-semibold">
                    Cancellation policy
                  </Dialog.Title>
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>
                <ul className="space-y-3 text-sm text-neutral-600 dark:text-neutral-300">
                  {tiers.map((tier) => (
                    <li key={tier} className="flex gap-2.5">
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-neutral-400 flex-shrink-0" />
                      <span>{tier}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-5 text-xs text-neutral-400">
                  Refund timing is based on this listing&apos;s check-in time.
                </p>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition>
    </>
  );
}
