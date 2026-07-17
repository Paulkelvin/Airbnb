import { MetadataRoute } from "next";
import { sanityClient } from "@/lib/sanity/client";
import { sitemapPostsQuery } from "@/lib/sanity/queries";
import { blogPosts } from "@/data/blogPosts";
import { getSiteUrl } from "@/lib/site-url";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();

  const entries: MetadataRoute.Sitemap = [
    {
      url: `${siteUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
  ];

  if (process.env.NEXT_PUBLIC_SANITY_PROJECT_ID) {
    try {
      const posts = await sanityClient.fetch<
        { slug: string; publishedAt: string; _updatedAt: string }[]
      >(sitemapPostsQuery);

      for (const post of posts) {
        entries.push({
          url: `${siteUrl}/blog/${post.slug}`,
          lastModified: new Date(post._updatedAt || post.publishedAt),
          changeFrequency: "monthly",
          priority: 0.6,
        });
      }
      return entries;
    } catch {
      // Fall through to hardcoded
    }
  }

  for (const post of blogPosts) {
    entries.push({
      url: `${siteUrl}/blog/${post.slug}`,
      changeFrequency: "monthly",
      priority: 0.6,
    });
  }

  return entries;
}
