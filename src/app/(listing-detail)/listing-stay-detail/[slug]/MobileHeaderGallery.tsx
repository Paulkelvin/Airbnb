"use client";

import { useState, type UIEvent } from "react";
import Image from "next/image";
import { cloudinaryLoader } from "@/lib/cloudinary-image-loader";

interface MobileHeaderGalleryProps {
  images: { id: number; url: string }[];
  title: string;
  onOpenGallery: () => void;
}

/**
 * Mobile-only, full-bleed header (Airbnb's own mobile listing page pattern).
 * Same aspect ratio, crop, and quality as the old single-full-width version
 * — the only thing that changes is how much of the viewport each slide
 * occupies, because showing roughly half of the next photo (so the peek
 * itself signals there's more to swipe to) requires it to be less than
 * 100% wide. Native scroll-snap rather than hand-rolled touch tracking, so
 * a tap still opens the full gallery without being confused for a swipe.
 */
export default function MobileHeaderGallery({
  images,
  title,
  onOpenGallery,
}: MobileHeaderGalleryProps) {
  const [index, setIndex] = useState(0);

  const handleScroll = (e: UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const maxScroll = el.scrollWidth - el.clientWidth;
    if (maxScroll <= 0) return;
    const proportion = el.scrollLeft / maxScroll;
    setIndex(Math.round(proportion * (images.length - 1)));
  };

  return (
    <div className="relative">
      <div
        onScroll={handleScroll}
        className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar gap-2 select-none"
      >
        {images.map((img, i) => (
          <button
            type="button"
            key={img.id}
            onClick={onOpenGallery}
            className="relative w-[65%] aspect-[4/3] shrink-0 snap-start overflow-hidden bg-neutral-100 dark:bg-neutral-800"
          >
            {img.url && (
              <Image
                fill
                loader={cloudinaryLoader}
                src={img.url}
                alt={i === 0 ? title : ""}
                priority={i === 0}
                className="object-cover"
                sizes="65vw"
              />
            )}
          </button>
        ))}
      </div>

      {images.length > 1 && (
        // bottom-8 (not bottom-3): the rounded content panel below this
        // gallery overlaps the image's bottom ~24px (see the -mt-6 on
        // ListingDetailView's <main>) — anything closer to the edge than
        // that gets clipped underneath it.
        <div className="absolute bottom-8 right-[38%] bg-black/60 text-white text-xs font-medium px-2.5 py-1 rounded-full pointer-events-none">
          {index + 1} / {images.length}
        </div>
      )}
    </div>
  );
}
