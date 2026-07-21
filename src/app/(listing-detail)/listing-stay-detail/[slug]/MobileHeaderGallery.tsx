"use client";

import { useRef, useState, type TouchEvent } from "react";
import Image from "next/image";
import { cloudinaryLoader } from "@/lib/cloudinary-image-loader";

interface MobileHeaderGalleryProps {
  images: { id: number; url: string }[];
  title: string;
  onOpenGallery: () => void;
}

const SWIPE_THRESHOLD_PX = 50;

/**
 * Mobile-only, full-bleed, one-photo-at-a-time header (Airbnb's own mobile
 * listing page pattern) — swap-in for the multi-tile grid header used at
 * sm+ widths, which doesn't fit a narrow viewport the same way.
 */
export default function MobileHeaderGallery({
  images,
  title,
  onOpenGallery,
}: MobileHeaderGalleryProps) {
  const [index, setIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const touchDeltaX = useRef(0);

  const goTo = (next: number) => {
    setIndex(Math.max(0, Math.min(images.length - 1, next)));
  };

  const handleTouchStart = (e: TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchDeltaX.current = 0;
  };
  const handleTouchMove = (e: TouchEvent) => {
    if (touchStartX.current === null) return;
    touchDeltaX.current = e.touches[0].clientX - touchStartX.current;
  };
  const handleTouchEnd = () => {
    if (touchDeltaX.current > SWIPE_THRESHOLD_PX) goTo(index - 1);
    else if (touchDeltaX.current < -SWIPE_THRESHOLD_PX) goTo(index + 1);
    touchStartX.current = null;
    touchDeltaX.current = 0;
  };

  return (
    <div
      className="relative w-full aspect-[4/3] overflow-hidden bg-neutral-100 dark:bg-neutral-800"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onClick={onOpenGallery}
    >
      <div
        className="flex h-full transition-transform duration-300 ease-out"
        style={{ transform: `translateX(-${index * 100}%)` }}
      >
        {images.map((img, i) => (
          <div key={img.id} className="relative w-full h-full flex-shrink-0">
            {img.url && (
              <Image
                fill
                loader={cloudinaryLoader}
                src={img.url}
                alt={i === 0 ? title : ""}
                priority={i === 0}
                className="object-cover"
                sizes="100vw"
              />
            )}
          </div>
        ))}
      </div>

      {images.length > 1 && (
        <div className="absolute bottom-3 right-3 bg-black/60 text-white text-xs font-medium px-2.5 py-1 rounded-full pointer-events-none">
          {index + 1} / {images.length}
        </div>
      )}
    </div>
  );
}
