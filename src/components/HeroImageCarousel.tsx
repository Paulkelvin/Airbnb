"use client";

import React, { useEffect, useRef, useState } from "react";
import Image, { type StaticImageData } from "next/image";

export interface HeroImageCarouselProps {
  className?: string;
  images: (string | StaticImageData)[];
  intervalMs?: number;
}

const SWIPE_THRESHOLD_PX = 50;

/**
 * Slides through a set of cottage photos, auto-advancing on a timer but also
 * draggable/swipeable by touch, mouse, or pen (Pointer Events unify all
 * three) — dragging follows the finger in real time and snaps to the
 * nearest slide on release. Auto-advance pauses while a drag is in progress
 * so it can't yank the carousel out from under an in-progress swipe.
 */
const HeroImageCarousel: React.FC<HeroImageCarouselProps> = ({
  className = "",
  images,
  intervalMs = 4500,
}) => {
  const [index, setIndex] = useState(0);
  const [dragOffsetPx, setDragOffsetPx] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartX = useRef<number | null>(null);

  useEffect(() => {
    if (images.length <= 1 || isDragging) return;
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % images.length);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [images.length, intervalMs, isDragging]);

  const goTo = (next: number) => {
    setIndex((next + images.length) % images.length);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (images.length <= 1) return;
    dragStartX.current = e.clientX;
    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragStartX.current === null) return;
    setDragOffsetPx(e.clientX - dragStartX.current);
  };
  const endDrag = () => {
    if (dragStartX.current === null) return;
    if (dragOffsetPx > SWIPE_THRESHOLD_PX) goTo(index - 1);
    else if (dragOffsetPx < -SWIPE_THRESHOLD_PX) goTo(index + 1);
    dragStartX.current = null;
    setDragOffsetPx(0);
    setIsDragging(false);
  };

  const dragOffsetPercent = containerRef.current
    ? (dragOffsetPx / containerRef.current.clientWidth) * 100
    : 0;

  return (
    <div
      ref={containerRef}
      className={`relative w-full aspect-[4/3] rounded-2xl overflow-hidden touch-pan-y select-none ${className}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      <div
        className={`flex h-full ${
          isDragging ? "" : "transition-transform duration-700 ease-in-out"
        }`}
        style={{ transform: `translateX(calc(-${index * 100}% + ${dragOffsetPercent}%))` }}
      >
        {images.map((src, i) => (
          <div key={i} className="relative w-full h-full flex-shrink-0">
            <Image
              src={src}
              alt="Potomac Vista Cottage"
              fill
              priority={i === 0}
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
              draggable={false}
            />
          </div>
        ))}
      </div>
      {images.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
          {images.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Go to slide ${i + 1}`}
              onClick={() => goTo(i)}
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
