import React from "react";
import {
  ShieldCheckIcon,
  LockClosedIcon,
  BoltIcon,
  ChatBubbleLeftRightIcon,
} from "@heroicons/react/24/outline";

const REASONS = [
  {
    icon: ShieldCheckIcon,
    title: "Verified hosts & listings",
    desc: "Every property is reviewed and every host is identity-checked before they can list, so you always know what you're booking.",
  },
  {
    icon: LockClosedIcon,
    title: "Secure payments",
    desc: "Your payment is encrypted and held safely until after check-in — hosts never see your card details.",
  },
  {
    icon: BoltIcon,
    title: "Instant confirmation",
    desc: "No waiting on approval emails. Most stays confirm the moment you book, so you can plan the rest of your trip right away.",
  },
  {
    icon: ChatBubbleLeftRightIcon,
    title: "Support around the clock",
    desc: "Real humans, day or night. If something's off with your stay, our team is one message away from making it right.",
  },
];

const SectionWhyBookWithUs = () => {
  return (
    <div className="nc-SectionWhyBookWithUs relative">
      <div className="absolute inset-0 -z-10 rounded-[2.5rem] bg-gradient-to-br from-primary-50 via-white to-secondary-50 dark:from-neutral-800 dark:via-neutral-900 dark:to-neutral-800" />
      <div className="px-6 py-16 sm:px-12 sm:py-20 lg:py-24 rounded-[2.5rem]">
        <div className="max-w-2xl mx-auto text-center mb-14">
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-semibold text-neutral-900 dark:text-neutral-50">
            Why book with Potomac
          </h2>
          <p className="mt-3 text-neutral-500 dark:text-neutral-400">
            We handle the details so you can focus on the trip.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {REASONS.map((reason) => (
            <div
              key={reason.title}
              className="group bg-white/70 dark:bg-neutral-900/60 backdrop-blur-sm rounded-3xl p-6 lg:p-7 border border-white/60 dark:border-neutral-700/60 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-2xl bg-primary-6000 text-white flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
                <reason.icon className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-50 mb-2">
                {reason.title}
              </h3>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">
                {reason.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SectionWhyBookWithUs;
