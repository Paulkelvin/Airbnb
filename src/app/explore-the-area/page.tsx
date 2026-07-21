import Link from "next/link";
import BgGlassmorphism from "@/components/BgGlassmorphism";
import LocalExperienceCard from "@/components/LocalExperienceCard";
import ExploreAreaMap from "@/components/ExploreAreaMap/ExploreAreaMap";
import { getAllExperiences } from "@/lib/local-experiences";
import { getPrimaryListing } from "@/modules/listings/queries";
import { CATEGORY_EMOJI } from "@/data/local-experiences";
import type { Route } from "@/routers/types";

export const metadata = {
  title: "Explore the Area",
  description:
    "Potomac Vista Cottage sits right on the water — and some of the area's best waterfront parks, restaurants, and attractions are just minutes away.",
};

// getPrimaryListing() is a raw Prisma call (no try/catch — unlike the Sanity
// experience queries, which always resolve to a fallback). searchParams
// usage already makes this page dynamic at runtime, but Next's build-time
// static-generation attempt doesn't know that ahead of time and needs this
// to skip the attempt outright — same reasoning as sitemap.ts and
// /api/listings/primary: a database hiccup at build time must never fail
// the whole build.
export const dynamic = "force-dynamic";

export default async function ExploreTheAreaPage({
  searchParams,
}: {
  searchParams: { category?: string };
}) {
  const [experiences, primaryListing] = await Promise.all([
    getAllExperiences(),
    getPrimaryListing(),
  ]);
  const categories = Array.from(new Set(experiences.map((a) => a.category)));
  const activeCategory = searchParams.category;
  const visible = activeCategory
    ? experiences.filter((a) => a.category === activeCategory)
    : experiences;

  const cottage =
    primaryListing?.latitude != null && primaryListing?.longitude != null
      ? { lat: primaryListing.latitude, lng: primaryListing.longitude, label: primaryListing.title }
      : null;

  return (
    <div className="nc-ExploreTheAreaPage overflow-hidden relative">
      <BgGlassmorphism />
      <div className="container relative py-16 lg:py-28">
        <h1 className="text-3xl md:text-4xl font-semibold">Discover the Neighborhood</h1>
        <span className="block mt-3 text-neutral-500 dark:text-neutral-400 text-lg max-w-2xl">
          The cottage sits right on the water, and some of the area's best waterfront parks,
          restaurants, and attractions are just minutes away too.
        </span>

        <div className="flex gap-2 overflow-x-auto no-scrollbar mt-8 pb-1">
          <Link
            href={"/explore-the-area" as Route}
            className={`flex-none px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
              !activeCategory
                ? "bg-neutral-900 text-white border-neutral-900 dark:bg-white dark:text-neutral-900"
                : "border-neutral-200 text-neutral-700 hover:border-neutral-400 dark:border-neutral-700 dark:text-neutral-300 dark:hover:border-neutral-500"
            }`}
          >
            All
          </Link>
          {categories.map((category) => (
            <Link
              key={category}
              href={`/explore-the-area?category=${encodeURIComponent(category)}` as Route}
              className={`flex-none px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                activeCategory === category
                  ? "bg-neutral-900 text-white border-neutral-900 dark:bg-white dark:text-neutral-900"
                  : "border-neutral-200 text-neutral-700 hover:border-neutral-400 dark:border-neutral-700 dark:text-neutral-300 dark:hover:border-neutral-500"
              }`}
            >
              {CATEGORY_EMOJI[category] ?? ""} {category}
            </Link>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 mt-10">
          {visible.map((experience) => (
            <LocalExperienceCard key={experience.id} data={experience} />
          ))}
        </div>

        {visible.length === 0 && (
          <p className="mt-10 text-center text-neutral-500 dark:text-neutral-400">
            Nothing in this category yet — check back soon.
          </p>
        )}

        {cottage && (
          <div className="mt-16">
            <h2 className="text-xl font-semibold mb-4">See it on the map</h2>
            <ExploreAreaMap className="h-[28rem]" cottage={cottage} experiences={experiences} />
          </div>
        )}
      </div>
    </div>
  );
}
