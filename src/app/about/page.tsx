import React from "react";
import BgGlassmorphism from "@/components/BgGlassmorphism";
import Image from "next/image";

export const metadata = {
  title: "About Us",
  description: "Learn about Potomac — our mission to connect travelers with unique stays and long-term rentals worldwide.",
};

const stats = [
  { label: "Properties listed", value: "10,000+" },
  { label: "Cities worldwide", value: "150+" },
  { label: "Happy guests", value: "50,000+" },
  { label: "Verified hosts", value: "3,000+" },
];

const values = [
  {
    title: "Trust & Safety",
    description: "Every host is verified, every property is reviewed. We maintain rigorous standards so you can book with confidence.",
  },
  {
    title: "Local Experience",
    description: "We believe the best travel means living like a local. Our hosts share insider tips and genuine hospitality.",
  },
  {
    title: "Fair Pricing",
    description: "Transparent pricing with no hidden fees. What you see is what you pay — for both short stays and long-term leases.",
  },
  {
    title: "Community First",
    description: "We're building a community of travelers and hosts who share a passion for meaningful connections and memorable stays.",
  },
];

const PageAbout: React.FC = () => {
  return (
    <div className="nc-PageAbout overflow-hidden relative">
      <BgGlassmorphism />
      <div className="container py-16 lg:py-28 space-y-16 lg:space-y-28">
        {/* HERO */}
        <div className="max-w-3xl">
          <h2 className="text-3xl md:text-4xl font-semibold">
            About Potomac
          </h2>
          <span className="block mt-3 text-neutral-500 dark:text-neutral-400 text-lg">
            Connecting travelers with unforgettable places to stay.
          </span>
          <div className="w-14 border-b border-neutral-200 dark:border-neutral-700 mt-6 mb-10"></div>
          <p className="text-neutral-600 dark:text-neutral-300 leading-relaxed">
            Potomac was born from a simple idea: everyone deserves access to
            beautiful, comfortable places to stay — whether for a weekend
            getaway or a year-long lease. We connect discerning travelers with
            verified hosts who offer everything from cozy city apartments to
            sprawling countryside villas.
          </p>
          <p className="text-neutral-600 dark:text-neutral-300 leading-relaxed mt-4">
            Our platform supports both short-term rentals and long-term leases,
            making it easy to find your next home away from home — or your
            actual next home. With transparent pricing, verified listings, and
            a community of passionate hosts, Potomac is where great stays begin.
          </p>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 lg:gap-8">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="p-6 bg-neutral-50 dark:bg-neutral-800 rounded-2xl text-center"
            >
              <h3 className="text-2xl md:text-3xl font-semibold text-neutral-900 dark:text-neutral-100">
                {stat.value}
              </h3>
              <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
                {stat.label}
              </p>
            </div>
          ))}
        </div>

        {/* MISSION */}
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          <div>
            <h3 className="text-2xl md:text-3xl font-semibold">Our Mission</h3>
            <div className="w-14 border-b border-neutral-200 dark:border-neutral-700 mt-4 mb-6"></div>
            <p className="text-neutral-600 dark:text-neutral-300 leading-relaxed">
              We're on a mission to make finding and booking quality
              accommodations effortless. Whether you're a digital nomad looking
              for a month-long stay, a family planning a vacation, or someone
              relocating to a new city, Potomac has the right property waiting
              for you.
            </p>
            <p className="text-neutral-600 dark:text-neutral-300 leading-relaxed mt-4">
              For hosts, we provide the tools and visibility to reach the right
              guests, manage bookings seamlessly, and grow a thriving rental
              business — all backed by our secure payment processing and
              dedicated support team.
            </p>
          </div>
          <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-neutral-100 dark:bg-neutral-800">
            <Image
              src="https://images.pexels.com/photos/1268871/pexels-photo-1268871.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750"
              fill
              alt="Beautiful property exterior"
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </div>
        </div>

        {/* VALUES */}
        <div>
          <h3 className="text-2xl md:text-3xl font-semibold text-center">
            What We Stand For
          </h3>
          <p className="mt-3 text-neutral-500 dark:text-neutral-400 text-center max-w-2xl mx-auto">
            Our values guide every decision we make, from the features we build
            to the hosts we partner with.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-10">
            {values.map((value) => (
              <div
                key={value.title}
                className="p-6 rounded-2xl border border-neutral-200 dark:border-neutral-700 hover:shadow-lg transition-shadow"
              >
                <h4 className="text-lg font-semibold">{value.title}</h4>
                <p className="mt-3 text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">
                  {value.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="bg-neutral-900 dark:bg-neutral-800 rounded-2xl p-10 lg:p-16 text-center">
          <h3 className="text-2xl md:text-3xl font-semibold text-white">
            Ready to find your perfect stay?
          </h3>
          <p className="mt-3 text-neutral-300 max-w-xl mx-auto">
            Browse thousands of verified properties or list your own space and
            start earning. Join the Potomac community today.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/listing-stay"
              className="px-8 py-3 rounded-full bg-white text-neutral-900 font-medium hover:bg-neutral-100 transition-colors"
            >
              Browse listings
            </a>
            <a
              href="/add-listing/1"
              className="px-8 py-3 rounded-full border border-neutral-400 text-white font-medium hover:bg-neutral-700 transition-colors"
            >
              Become a host
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PageAbout;
