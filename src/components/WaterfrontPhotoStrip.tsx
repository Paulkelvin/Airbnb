import Image from "next/image";
import Link from "next/link";
import { cloudinaryLoader } from "@/lib/cloudinary-image-loader";
import type { LocalExperience } from "@/data/local-experiences";
import type { Route } from "@/routers/types";

/** Swipeable strip of real nearby waterfront spots (photo + name, linking to
 * their Explore the Area page) — shared by the listing detail page's water
 * access callout and the FAQ answer for the same question, so both show the
 * same live preview instead of one being a text-only stand-in. */
export default function WaterfrontPhotoStrip({ experiences }: { experiences: LocalExperience[] }) {
  // Only ones with a verified photo — this strip is a quick visual preview,
  // not a directory, so an entry with no photo yet isn't worth a thumbnail
  // slot (and an empty src would otherwise render a broken image box).
  const waterfront = experiences.filter((e) => e.category === "Waterfront" && e.imageUrl);

  if (waterfront.length === 0) return null;

  return (
    <div className="mt-3.5 -mx-1 flex gap-2.5 overflow-x-auto no-scrollbar px-1 pb-1">
      {waterfront.map((experience) => (
        <Link
          key={experience.id}
          href={`/explore-the-area/${experience.slug}` as Route}
          className="flex-shrink-0 w-24 group"
        >
          <div className="relative w-24 h-24 rounded-xl overflow-hidden bg-amber-100 dark:bg-amber-900/40">
            <Image
              loader={cloudinaryLoader}
              src={experience.imageUrl}
              alt={experience.title}
              fill
              sizes="96px"
              className="object-cover transition-transform group-hover:scale-105"
            />
          </div>
          <p className="mt-1 text-xs font-medium text-amber-900 dark:text-amber-200 leading-tight line-clamp-2">
            {experience.title}
          </p>
        </Link>
      ))}
    </div>
  );
}
