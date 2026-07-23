import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-url";
import { getPublishedListingSlugsForSitemap } from "@/modules/listings/queries";
import { getAllExperiences } from "@/lib/local-experiences";

/**
 * Dynamic sitemap (Next.js 13 `app/sitemap.ts` convention) — lists every
 * published listing detail page plus the site's static marketing routes.
 * Account/admin/checkout/API routes are intentionally excluded (see
 * `src/app/robots.ts`, which disallows crawling them).
 *
 * `force-dynamic` (not the default static-at-build-time behavior) so this
 * route is generated per-request, never baked into the Vercel build — a
 * transient database hiccup (or, as discovered during deployment, the
 * database simply not existing yet at build time) must never fail the
 * entire build over a sitemap. `revalidate` alone isn't enough here: App
 * Router still attempts an initial static generation pass for an ISR
 * route at build time, which is exactly the failure this avoids.
 */
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${siteUrl}/`, changeFrequency: "daily", priority: 1 },
    { url: `${siteUrl}/explore-the-area`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${siteUrl}/about`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${siteUrl}/contact`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${siteUrl}/faq`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${siteUrl}/login`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${siteUrl}/signup`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${siteUrl}/privacy`, changeFrequency: "yearly", priority: 0.1 },
    { url: `${siteUrl}/terms`, changeFrequency: "yearly", priority: 0.1 },
    { url: `${siteUrl}/blog`, changeFrequency: "weekly", priority: 0.5 },
  ];

  const [listings, experiences] = await Promise.all([
    getPublishedListingSlugsForSitemap(),
    getAllExperiences(),
  ]);
  const listingRoutes: MetadataRoute.Sitemap = listings.map((listing) => ({
    url: `${siteUrl}/listing-stay-detail/${listing.slug}`,
    lastModified: listing.updatedAt,
    changeFrequency: "daily",
    priority: 0.8,
  }));
  const experienceRoutes: MetadataRoute.Sitemap = experiences.map((experience) => ({
    url: `${siteUrl}/explore-the-area/${experience.slug}`,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [...staticRoutes, ...listingRoutes, ...experienceRoutes];
}
