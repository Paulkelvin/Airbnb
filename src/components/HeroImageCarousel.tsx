"use client";

import React, { useEffect, useState } from "react";
import Image, { type StaticImageData } from "next/image";

export interface HeroImageCarouselProps {
  className?: string;
  images: (string | StaticImageData)[];
  intervalMs?: number;
}

/**
 * Crossfades through a set of cottage photos rather than showing one static
 * image. Until real photos of the actual cottage are supplied, this cycles
 * through placeholder stock photos — swap the `images` array in SectionHero
 * for real ones whenever they're available; nothing else here needs to change.
 */
const HeroImageCarousel: React.FC<HeroImageCarouselProps> = ({
  className = "",
  images,
  intervalMs = 4500,
}) => {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (images.length <= 1) return;
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % images.length);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [images.length, intervalMs]);

  return (
    <div className={`relative w-full aspect-[4/3] rounded-2xl overflow-hidden ${className}`}>
      {images.map((src, i) => (
        <Image
          key={i}
          src={src}
          alt="Potomac Vista Cottage"
          fill
          priority={i === 0}
          sizes="(max-width: 1024px) 100vw, 50vw"
          className={`object-cover transition-opacity duration-1000 ease-in-out ${
            i === index ? "opacity-100" : "opacity-0"
          }`}
        />
      ))}
      {images.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
          {images.map((_, i) => (
            <span
              key={i}
              className={`w-1.5 h-1.5 rounded-full transition-colors ${
                i === index ? "bg-white" : "bg-white/50"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default HeroImageCarousel;
