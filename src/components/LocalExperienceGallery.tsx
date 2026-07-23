"use client";

import { FC, useState } from "react";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import type { Route } from "next";
import ListingImageGallery, {
  getNewParam,
} from "@/components/listing-image-gallery/ListingImageGallery";
import type { ListingGalleryImage } from "@/components/listing-image-gallery/utils/types";

const MAX_PREVIEW_TILES = 5;

export interface LocalExperienceGalleryProps {
  images: string[];
  title: string;
}

/**
 * Shows as many preview tiles as we have (up to 5 — 1 large + 4 small); any
 * extra past that get folded into a "+N" overlay on the last tile. Clicking
 * any tile opens the full lightbox (reused from the listing gallery), which
 * can page through every photo, not just the ones visible in the preview —
 * so this scales cleanly whether a location has 3 photos or 30.
 */
const LocalExperienceGallery: FC<LocalExperienceGalleryProps> = ({ images, title }) => {
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const galleryImages: ListingGalleryImage[] = images.map((url, id) => ({ id, url }));
  const previewCount = Math.min(images.length, MAX_PREVIEW_TILES);
  const hiddenCount = images.length - previewCount;
  const isSingleImage = previewCount === 1;

  const openAt = (index: number) => {
    const params = getNewParam({ value: index });
    router.push(`${pathname}/?${params}` as Route);
    setIsGalleryOpen(true);
  };

  return (
    <>
      {/* Mobile: a peek carousel — each tile is ~72% wide so the next one is
       * about half-visible at rest, signalling there's more to swipe to. The
       * first tile keeps the page's normal left inset (lines up with the
       * heading/description above it) — only the right side bleeds past the
       * viewport edge so the next photo peeks in. When there's only one
       * photo there's nothing to swipe to, so it's centered instead of
       * sitting flush left.
       * sm+: the original 1-large + small-tiles grid, unchanged. */}
      <div
        className={`mt-10 flex sm:grid sm:grid-cols-2 gap-3 ${
          isSingleImage
            ? "justify-center"
            : "overflow-x-auto sm:overflow-visible snap-x snap-mandatory no-scrollbar -mr-4 pr-4 sm:mr-0 sm:pr-0"
        }`}
      >
        <button
          type="button"
          onClick={() => openAt(0)}
          className={`relative ${isSingleImage ? "w-full" : "w-[72%] shrink-0 snap-start"} sm:w-auto sm:shrink aspect-[4/5] sm:aspect-auto sm:row-span-2 rounded-2xl overflow-hidden bg-neutral-100 dark:bg-neutral-800 focus:outline-none`}
        >
          <Image
            src={images[0]}
            alt={title}
            fill
            sizes="(max-width: 768px) 72vw, 50vw"
            className="object-cover"
            priority
          />
        </button>
        {images.slice(1, previewCount).map((url, i) => {
          const index = i + 1;
          const isLastVisible = index === previewCount - 1 && hiddenCount > 0;
          return (
            <button
              type="button"
              key={url}
              onClick={() => openAt(index)}
              className="relative w-[72%] sm:w-auto shrink-0 sm:shrink aspect-[4/5] sm:aspect-[4/3] snap-start rounded-2xl overflow-hidden bg-neutral-100 dark:bg-neutral-800 focus:outline-none"
            >
              <Image
                src={url}
                alt=""
                fill
                sizes="(max-width: 768px) 72vw, 25vw"
                className="object-cover"
              />
              {isLastVisible && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <span className="text-white text-lg font-semibold">+{hiddenCount} more</span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      <ListingImageGallery
        isShowModal={isGalleryOpen}
        onClose={() => setIsGalleryOpen(false)}
        images={galleryImages}
      />
    </>
  );
};

export default LocalExperienceGallery;
