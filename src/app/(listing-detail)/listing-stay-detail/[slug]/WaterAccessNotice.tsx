import Image from "next/image";
import Link from "next/link";
import { InformationCircleIcon } from "@heroicons/react/24/outline";
import { cloudinaryLoader } from "@/lib/cloudinary-image-loader";
import type { LocalExperience } from "@/data/local-experiences";
import type { Route } from "@/routers/types";

/**
 * A standalone, always-visible disclosure — deliberately not folded into the
 * description paragraph or the collapsed FAQ accordion. A guest already
 * complained once about expecting water access this listing doesn't have, so
 * this needs to be seen before booking, not found by someone who happens to
 * expand the right FAQ question.
 *
 * The waterfront strip below the copy is a live preview, not a text list —
 * guests can swipe through the actual nearby waterfront spots (same data as
 * Explore the Area) rather than read names and drive times.
 */
export default function WaterAccessNotice({
  experiences,
}: {
  experiences: LocalExperience[];
}) {
  // Only ones with a verified photo — this strip is a quick visual preview,
  // not a directory, so an entry with no photo yet isn't worth a thumbnail
  // slot (and an empty src would otherwise render a broken image box).
  const waterfront = experiences.filter((e) => e.category === "Waterfront" && e.imageUrl);

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/30 p-4 sm:p-5">
      <div className="flex gap-3">
        <InformationCircleIcon className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-amber-900 dark:text-amber-200 space-y-1">
          <p className="font-semibold">A note on water access</p>
          <p>
            Potomac Vista Cottage does not have direct water access, a private beach, dock, or
            pier on the property. If getting out on the water is part of your trip, here are
            nearby places our guests go:
          </p>
        </div>
      </div>

      {waterfront.length > 0 && (
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
      )}
    </div>
  );
}
