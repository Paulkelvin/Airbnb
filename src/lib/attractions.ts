import { sanityClient } from "@/lib/sanity/client";
import { featuredAttractionsQuery, allAttractionsQuery } from "@/lib/sanity/queries";
import { attractions as staticAttractions, type Attraction } from "@/data/attractions";
import type { TaxonomyType } from "@/data/types";
import type { Route } from "@/routers/types";

interface SanityAttraction {
  _id: string;
  title: string;
  category: string;
  description: string;
  imageUrl: string;
  distanceLabel: string;
  externalUrl?: string;
  featured: boolean;
}

function toAttraction(a: SanityAttraction): Attraction {
  return {
    id: a._id,
    title: a.title,
    category: a.category,
    description: a.description,
    imageUrl: a.imageUrl,
    distanceLabel: a.distanceLabel,
    externalUrl: a.externalUrl,
    featured: a.featured,
  };
}

/** Featured subset shown on the homepage and listing detail page. Falls back
 * to static demo content if Sanity isn't configured or has no featured items
 * yet, matching the pattern in src/app/faq/page.tsx. */
export async function getFeaturedAttractions(): Promise<Attraction[]> {
  if (!process.env.NEXT_PUBLIC_SANITY_PROJECT_ID) {
    return staticAttractions.filter((a) => a.featured);
  }
  try {
    const result = await sanityClient.fetch<SanityAttraction[]>(featuredAttractionsQuery);
    return result.length > 0 ? result.map(toAttraction) : staticAttractions.filter((a) => a.featured);
  } catch {
    return staticAttractions.filter((a) => a.featured);
  }
}

/** Full list shown on /explore-the-area, grouped/filterable by category. */
export async function getAllAttractions(): Promise<Attraction[]> {
  if (!process.env.NEXT_PUBLIC_SANITY_PROJECT_ID) {
    return staticAttractions;
  }
  try {
    const result = await sanityClient.fetch<SanityAttraction[]>(allAttractionsQuery);
    return result.length > 0 ? result.map(toAttraction) : staticAttractions;
  } catch {
    return staticAttractions;
  }
}

/**
 * Groups attractions into one TaxonomyType per category so the homepage can
 * reuse SectionSliderNewCategories' carousel as-is (it already accepts
 * generic TaxonomyType[] — no need for a bespoke category-carousel
 * component) instead of the old per-city taxonomy.
 */
export function getAttractionCategoryTaxonomies(attractions: Attraction[]): TaxonomyType[] {
  const byCategory = new Map<string, Attraction[]>();
  for (const a of attractions) {
    const list = byCategory.get(a.category) ?? [];
    list.push(a);
    byCategory.set(a.category, list);
  }

  return Array.from(byCategory.entries()).map(([category, items]) => ({
    id: category,
    name: category,
    href: `/explore-the-area?category=${encodeURIComponent(category)}` as Route,
    count: items.length,
    thumbnail: items[0]?.imageUrl,
    taxonomy: "category" as const,
  }));
}
