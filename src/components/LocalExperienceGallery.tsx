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

  const openAt = (index: number) => {
    const params = getNewParam({ value: index });
    router.push(`${pathname}/?${params}` as Route);
    setIsGalleryOpen(true);
  };

  return (
    <>
      <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => openAt(0)}
          className="relative aspect-[4/3] sm:aspect-auto sm:row-span-2 rounded-2xl overflow-hidden bg-neutral-100 dark:bg-neutral-800 focus:outline-none"
        >
          <Image
            src={images[0]}
            alt={title}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
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
              className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-neutral-100 dark:bg-neutral-800 focus:outline-none"
            >
              <Image
                src={url}
                alt=""
                fill
                sizes="(max-width: 768px) 100vw, 25vw"
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
