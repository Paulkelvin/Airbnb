"use client";

import { useEffect } from "react";

/**
 * Forces this page to open at the very top on every fresh navigation.
 *
 * Guests reported these pages opening scrolled partway down (past the title
 * and tagline) instead of at the top, even after deferring the Google Map's
 * mount ruled that out as the cause. The jump size lines up with Next.js
 * App Router's own built-in post-navigation scroll-and-focus handler
 * (visible internally as ScrollAndFocusHandler in layout-router.js)
 * targeting the wrong element on this page rather than the page root — a
 * known class of bug in nested client-component trees. Rather than depend
 * on pinning down that exact internal behavior, this forces the scroll
 * position deterministically: once synchronously on mount, and again one
 * frame later to override any scroll Next.js's own handler applies after
 * this component has already mounted.
 */
export default function ScrollToTopOnMount() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.scrollTo(0, 0);
    const raf = requestAnimationFrame(() => window.scrollTo(0, 0));
    return () => cancelAnimationFrame(raf);
  }, []);

  return null;
}
