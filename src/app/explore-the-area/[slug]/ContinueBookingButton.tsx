"use client";

import { useEffect, useRef, useState } from "react";
import ButtonPrimary from "@/components/ui/ButtonPrimary";
import type { Route } from "@/routers/types";

/**
 * position:sticky can't be used for this — the page wrapper
 * (nc-LocalExperiencePage) has overflow-hidden, to clip BgGlassmorphism's
 * decorative blobs, and any overflow-hidden ancestor breaks sticky's
 * containing-block chain to the viewport, so a sticky element inside it
 * just scrolls away like a normal one instead of sticking (that's why the
 * previous sticky attempt scrolled out of view instead of staying put).
 * position:fixed isn't affected by an ancestor's overflow-hidden, but
 * showing it unconditionally left it floating at a raw screen offset even
 * while still at the top of the page, disconnected from the "Explore the
 * Area" link beside it.
 *
 * This renders one real button inline (in its natural spot beside that
 * link) and tracks its own visibility with an IntersectionObserver. Once
 * scrolling carries the inline button out of the viewport, a fixed
 * floating duplicate appears so it's still reachable no matter how far
 * down the page the guest scrolls — and disappears again the moment
 * scrolling back up brings the inline one back into view.
 */
export default function ContinueBookingButton({ listingSlug }: { listingSlug: string }) {
  const inlineRef = useRef<HTMLDivElement>(null);
  const [showFloating, setShowFloating] = useState(false);

  useEffect(() => {
    const el = inlineRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setShowFloating(!entry.isIntersecting), {
      threshold: 0,
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const button = (
    <ButtonPrimary
      href={`/listing-stay-detail/${listingSlug}` as Route}
      sizeClass="px-4 py-2"
      fontSize="text-sm"
      className="shadow-lg"
    >
      Continue booking →
    </ButtonPrimary>
  );

  return (
    <>
      <div ref={inlineRef}>{button}</div>
      {showFloating && (
        <div className="fixed top-4 right-4 sm:top-6 sm:right-6 z-40">{button}</div>
      )}
    </>
  );
}
