import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-url";

/**
 * Dynamic `robots.txt` (replaces the old static `public/robots.txt`) so the
 * `Sitemap:` line always points at the real deployed origin instead of a
 * hardcoded placeholder domain.
 */
export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/account*", "/add-listing*", "/checkout*", "/admin*"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
