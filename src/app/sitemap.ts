import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-url";
import { getPublishedListingSlugsForSitemap } from "@/modules/listings/queries";

/**
 * Dynamic sitemap (Next.js 13 `app/sitemap.ts` convention) — lists every
 * published listing detail page plus the site's static marketing routes.
 * Account/admin/checkout/API routes are intentionally excluded (see
 * `src/app/robots.ts`, which disallows crawling them).
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${siteUrl}/`, changeFrequency: "daily", priority: 1 },
    { url: `${siteUrl}/listing-stay`, changeFrequency: "hourly", priority: 0.9 },
    { url: `${siteUrl}/listing-stay-map`, changeFrequency: "hourly", priority: 0.7 },
    { url: `${siteUrl}/about`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${siteUrl}/contact`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${siteUrl}/help`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${siteUrl}/login`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${siteUrl}/signup`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${siteUrl}/privacy`, changeFrequency: "yearly", priority: 0.1 },
    { url: `${siteUrl}/terms`, changeFrequency: "yearly", priority: 0.1 },
    { url: `${siteUrl}/cookies`, changeFrequency: "yearly", priority: 0.1 },
  ];

  const listings = await getPublishedListingSlugsForSitemap();
  const listingRoutes: MetadataRoute.Sitemap = listings.map((listing) => ({
    url: `${siteUrl}/listing-stay-detail/${listing.slug}`,
    lastModified: listing.updatedAt,
    changeFrequency: "daily",
    priority: 0.8,
  }));

  return [...staticRoutes, ...listingRoutes];
}
