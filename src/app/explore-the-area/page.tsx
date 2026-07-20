import Link from "next/link";
import BgGlassmorphism from "@/components/BgGlassmorphism";
import AttractionCard from "@/components/AttractionCard";
import { getAllAttractions } from "@/lib/attractions";
import type { Route } from "@/routers/types";

export const metadata = {
  title: "Explore the Area",
  description:
    "Nearby restaurants, parks, waterfronts, and activities within easy reach of Potomac Vista Cottage.",
};

export default async function ExploreTheAreaPage({
  searchParams,
}: {
  searchParams: { category?: string };
}) {
  const attractions = await getAllAttractions();
  const categories = Array.from(new Set(attractions.map((a) => a.category)));
  const activeCategory = searchParams.category;
  const visible = activeCategory
    ? attractions.filter((a) => a.category === activeCategory)
    : attractions;

  return (
    <div className="nc-ExploreTheAreaPage overflow-hidden relative">
      <BgGlassmorphism />
      <div className="container relative py-16 lg:py-28">
        <h1 className="text-3xl md:text-4xl font-semibold">Explore the Area</h1>
        <span className="block mt-3 text-neutral-500 dark:text-neutral-400 text-lg">
          Everything worth seeing, eating, and doing within easy reach of Potomac Vista Cottage.
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
              {category}
            </Link>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 mt-10">
          {visible.map((attraction) => (
            <AttractionCard key={attraction.id} data={attraction} />
          ))}
        </div>

        {visible.length === 0 && (
          <p className="mt-10 text-center text-neutral-500 dark:text-neutral-400">
            Nothing in this category yet — check back soon.
          </p>
        )}
      </div>
    </div>
  );
}
