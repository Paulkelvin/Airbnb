import type { ImageLoaderProps } from "next/image";

/**
 * Lets Cloudinary's own CDN handle resizing/format negotiation (f_auto,
 * q_auto) instead of double-processing already-hosted images through
 * Next's built-in image optimizer. Only rewrites actual Cloudinary
 * delivery URLs — anything else (Pexels/Unsplash demo thumbnails, Sanity
 * CDN images) is returned as-is and rendered unoptimized, since this is
 * passed as a per-component `loader`, not the app-wide default.
 */
export function cloudinaryLoader({ src, width, quality }: ImageLoaderProps): string {
  if (!src.includes("res.cloudinary.com") || !src.includes("/upload/")) {
    return src;
  }
  const q = quality ? String(quality) : "auto";
  return src.replace("/upload/", `/upload/f_auto,q_${q},w_${width}/`);
}
