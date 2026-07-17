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
    <div className="nc-SectionWhyBookWithUs relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-primary-500 via-primary-6000 to-secondary-500">
      {/* Decorative glow accents */}
      <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-white/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-16 w-80 h-80 rounded-full bg-secondary-500/30 blur-3xl pointer-events-none" />

      <div className="relative px-6 py-16 sm:px-12 sm:py-20 lg:py-24">
        <div className="max-w-2xl mx-auto text-center mb-14">
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-semibold text-white">
            Book with confidence
          </h2>
          <p className="mt-3 text-primary-50">
            We handle the details so you can focus on the trip.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {REASONS.map((reason) => (
            <div
              key={reason.title}
              className="group bg-white/10 backdrop-blur-md rounded-3xl p-6 lg:p-7 border border-white/20 shadow-lg hover:bg-white/15 hover:-translate-y-1 transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-2xl bg-white text-primary-700 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
                <reason.icon className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-white mb-2">
                {reason.title}
              </h3>
              <p className="text-sm text-primary-50/90 leading-relaxed">
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
