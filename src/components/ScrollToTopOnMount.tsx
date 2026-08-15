"use client";

import { useEffect } from "react";

/**
 * Forces the page to open at the very top on every fresh navigation.
 *
 * Guests reported dynamic detail pages (local experience pages first, then
 * confirmed on the listing detail page too) opening scrolled partway down
 * instead of at the top. The jump size lines up with Next.js App Router's
 * own built-in post-navigation scroll-and-focus handler (visible internally
 * as ScrollAndFocusHandler in layout-router.js) targeting the wrong element
 * in a nested client-component tree rather than the page root — a known
 * class of bug, and one any sufficiently client-component-heavy page here
 * (gallery + map + accordion/reviews/booking widget) is liable to hit.
 *
 * A single mount-time correction wasn't enough on pages with more
 * images/content: late image decode and layout settling can still shift
 * things, or Next's own handler can still win if it runs after a single
 * correction. This corrects repeatedly across a real window (up to ~1.5s —
 * that class of layout settling is done well before then) and disables the
 * browser's own scroll restoration so back/forward navigation can't
 * reintroduce a stale position either. Critically, it stops the instant it
 * sees real user input (wheel/touch/key) — this must never fight a guest
 * who's actually trying to scroll.
 */
export default function ScrollToTopOnMount() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const previousRestoration = "scrollRestoration" in window.history ? window.history.scrollRestoration : null;
    if (previousRestoration) {
      window.history.scrollRestoration = "manual";
    }

    let userInteracted = false;
    const markInteracted = () => {
      userInteracted = true;
    };
    const interactionEvents: (keyof WindowEventMap)[] = ["wheel", "touchstart", "keydown"];
    interactionEvents.forEach((evt) => window.addEventListener(evt, markInteracted, { passive: true }));

    window.scrollTo(0, 0);

    let frame: number;
    const start = performance.now();
    const tick = (now: number) => {
      if (userInteracted) return;
      window.scrollTo(0, 0);
      if (now - start < 1500) {
        frame = requestAnimationFrame(tick);
      }
    };
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      interactionEvents.forEach((evt) => window.removeEventListener(evt, markInteracted));
      if (previousRestoration) {
        window.history.scrollRestoration = previousRestoration;
      }
    };
  }, []);

  return null;
}
