import React from "react";
import BgGlassmorphism from "@/components/BgGlassmorphism";
import Image from "next/image";
import { sanityClient } from "@/lib/sanity/client";
import { aboutPageQuery } from "@/lib/sanity/queries";
import PortableTextBody from "@/components/sanity/PortableTextBody";
import { getCurrentUser } from "@/lib/auth";
import { getPrimaryListing } from "@/modules/listings/queries";
import type { Route } from "@/routers/types";

export const revalidate = 3600;

export const metadata = {
  title: "About Us",
  description: "The story behind Potomac Vista Cottage, and why we built a peaceful riverside retreat with the area's best attractions right outside the door.",
};

interface SanityAboutPage {
  heroTitle: string;
  heroSubtitle?: string;
  heroBody?: unknown;
  stats?: { label: string; value: string }[];
  missionTitle?: string;
  missionBody?: unknown;
  missionImageUrl?: string;
  valuesTitle?: string;
  valuesSubtitle?: string;
  values?: { title: string; description: string }[];
  ctaTitle?: string;
  ctaSubtitle?: string;
}

async function getAboutPage(): Promise<SanityAboutPage | null> {
  if (!process.env.NEXT_PUBLIC_SANITY_PROJECT_ID) return null;
  try {
    return await sanityClient.fetch<SanityAboutPage | null>(aboutPageQuery);
  } catch {
    return null;
  }
}

const FALLBACK_STATS = [
  { label: "Private cottage", value: "1" },
  { label: "Riverside location", value: "Potomac" },
  { label: "Locally hosted", value: "100%" },
  { label: "Guest support", value: "24/7" },
];

const FALLBACK_MISSION_IMAGE_URL =
  "https://res.cloudinary.com/lbwzvp5s/image/upload/v1784642246/listings/potomac-vista-cottage/exterior-cottage-waterside.jpg";

const FALLBACK_VALUES = [
  { title: "Trust & Safety", description: "The cottage is maintained and hosted directly by our team, so you always know exactly what you're booking." },
  { title: "Local Experience", description: "We believe the best trips mean living like a local. That's why we built a guide to the area's parks, restaurants, and waterfronts right into the site." },
  { title: "Fair Pricing", description: "Transparent pricing with no hidden fees — what you see is what you pay." },
  { title: "Guest First", description: "Every detail, from check-in to checkout, is designed around making your stay effortless and memorable." },
];

export default async function PageAbout() {
  const [data, user, primaryListing] = await Promise.all([
    getAboutPage(),
    getCurrentUser(),
    getPrimaryListing(),
  ]);
  const isAdmin = user?.roles.includes("ADMIN") ?? false;
  const listingHref = primaryListing
    ? (`/listing-stay-detail/${primaryListing.slug}` as Route)
    : ("/listing-stay" as Route);

  const heroTitle = data?.heroTitle ?? "Our Story";
  const heroSubtitle = data?.heroSubtitle ?? "A peaceful riverside retreat, hosted directly by our team.";
  const stats = data?.stats && data.stats.length > 0 ? data.stats : FALLBACK_STATS;
  const missionTitle = data?.missionTitle ?? "Our Mission";
  const values = data?.values && data.values.length > 0 ? data.values : FALLBACK_VALUES;
  const valuesTitle = data?.valuesTitle ?? "What We Stand For";
  const valuesSubtitle =
    data?.valuesSubtitle ??
    "Our values guide every detail of the cottage and every recommendation in our area guide.";
  const ctaTitle = data?.ctaTitle ?? "Ready to plan your stay?";
  const ctaSubtitle =
    data?.ctaSubtitle ??
    "Check availability for Potomac Vista Cottage, or explore the restaurants, parks, and waterfronts nearby.";
  const missionImageUrl = data?.missionImageUrl || FALLBACK_MISSION_IMAGE_URL;

  return (
    <div className="nc-PageAbout overflow-hidden relative">
      <BgGlassmorphism />
      <div className="container py-16 lg:py-28 space-y-16 lg:space-y-28">
        {/* HERO */}
        <div className="max-w-3xl">
          <h1 className="text-3xl md:text-4xl font-semibold">{heroTitle}</h1>
          <span className="block mt-3 text-neutral-500 dark:text-neutral-400 text-lg">
            {heroSubtitle}
          </span>
          <div className="w-14 border-b border-neutral-200 dark:border-neutral-700 mt-6 mb-10"></div>
          {data?.heroBody ? (
            <div className="text-neutral-600 dark:text-neutral-300 leading-relaxed">
              <PortableTextBody value={data.heroBody} />
            </div>
          ) : (
            <>
              <p className="text-neutral-600 dark:text-neutral-300 leading-relaxed">
                Potomac Vista Cottage was built around a simple idea: a getaway
                should feel like a genuine escape, not just a place to sleep.
                Floor-to-ceiling views, thoughtful touches throughout, and a
                setting close to the river make it a home base for exploring
                everything the area has to offer.
              </p>
              <p className="text-neutral-600 dark:text-neutral-300 leading-relaxed mt-4">
                We host the cottage directly, so there's no guesswork about who
                you're booking with or what to expect at check-in. The cottage
                doesn't have its own beach, dock, or pier, so we've put together
                a guide to the best nearby parks, restaurants, and waterfronts —
                including where to launch a kayak — so there's always more to
                explore during your stay.
              </p>
            </>
          )}
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
            <h3 className="text-2xl md:text-3xl font-semibold">{missionTitle}</h3>
            <div className="w-14 border-b border-neutral-200 dark:border-neutral-700 mt-4 mb-6"></div>
            {data?.missionBody ? (
              <div className="text-neutral-600 dark:text-neutral-300 leading-relaxed">
                <PortableTextBody value={data.missionBody} />
              </div>
            ) : (
              <>
                <p className="text-neutral-600 dark:text-neutral-300 leading-relaxed">
                  We're on a mission to make booking a stay at the cottage — and
                  planning everything around it — effortless. Secure payments,
                  clear pricing, and a real team behind the scenes mean you can
                  focus on the trip, not the logistics.
                </p>
                <p className="text-neutral-600 dark:text-neutral-300 leading-relaxed mt-4">
                  That's also why we built Explore the Area: a curated guide to
                  the restaurants, parks, and waterfronts nearby, so you land with
                  a plan instead of a blank map.
                </p>
              </>
            )}
          </div>
          <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-neutral-100 dark:bg-neutral-800">
            <Image
              src={missionImageUrl}
              fill
              alt="Beautiful property exterior"
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </div>
        </div>

        {/* VALUES */}
        <div>
          <h3 className="text-2xl md:text-3xl font-semibold text-center">{valuesTitle}</h3>
          <p className="mt-3 text-neutral-500 dark:text-neutral-400 text-center max-w-2xl mx-auto">
            {valuesSubtitle}
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
          <h3 className="text-2xl md:text-3xl font-semibold text-white">{ctaTitle}</h3>
          <p className="mt-3 text-neutral-300 max-w-xl mx-auto">{ctaSubtitle}</p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href={listingHref}
              className="px-8 py-3 rounded-full bg-white text-neutral-900 font-medium hover:bg-neutral-100 transition-colors"
            >
              Check availability
            </a>
            {isAdmin && (
              <a
                href="/add-listing"
                className="px-8 py-3 rounded-full border border-neutral-400 text-white font-medium hover:bg-neutral-700 transition-colors"
              >
                Become a host
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
