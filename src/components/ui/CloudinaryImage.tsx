"use client";

import Image, { type ImageProps } from "next/image";
import { cloudinaryLoader } from "@/lib/cloudinary-image-loader";

/**
 * Thin `next/image` wrapper that applies `cloudinaryLoader` internally.
 * Functions can't be passed as props from a Server Component to a Client
 * Component (Next.js RSC serialization rejects them) — `<Image loader={fn}>`
 * used directly in a page.tsx or other Server Component throws
 * "Functions cannot be passed directly to Client Components" at render time.
 * Use this instead of `next/image` + `cloudinaryLoader` in any file that
 * isn't already `"use client"`.
 */
export default function CloudinaryImage(props: Omit<ImageProps, "loader">) {
  return <Image {...props} loader={cloudinaryLoader} />;
}
