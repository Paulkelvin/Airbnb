import { sanityClient } from "@/lib/sanity/client";
import {
  featuredLocalExperiencesQuery,
  allLocalExperiencesQuery,
  localExperienceBySlugQuery,
} from "@/lib/sanity/queries";
import {
  localExperiences as staticExperiences,
  CATEGORY_EMOJI,
  type LocalExperience,
} from "@/data/local-experiences";
import type { TaxonomyType } from "@/data/types";
import type { Route } from "@/routers/types";

interface SanityLocalExperience {
  _id: string;
  title: string;
  slug: string;
  category: string;
  tagline: string;
  description: string;
  imageUrl: string;
  galleryImageUrls?: string[];
  distanceLabel: string;
  latitude: number | null;
  longitude: number | null;
  openingHours: string | null;
  websiteUrl: string | null;
  featured: boolean;
}

function toLocalExperience(a: SanityLocalExperience): LocalExperience {
  return {
    id: a._id,
    slug: a.slug,
    title: a.title,
    category: a.category,
    tagline: a.tagline,
    description: a.description,
    imageUrl: a.imageUrl,
    galleryImageUrls: a.galleryImageUrls ?? [],
    distanceLabel: a.distanceLabel,
    latitude: a.latitude,
    longitude: a.longitude,
    openingHours: a.openingHours,
    websiteUrl: a.websiteUrl,
    featured: a.featured,
  };
}

/** Featured subset shown on the homepage and listing detail page. Falls back
 * to static demo content if Sanity isn't configured or has no featured items
 * yet, matching the pattern in src/app/faq/page.tsx. */
export async function getFeaturedExperiences(): Promise<LocalExperience[]> {
  if (!process.env.NEXT_PUBLIC_SANITY_PROJECT_ID) {
    return staticExperiences.filter((a) => a.featured);
  }
  try {
    const result = await sanityClient.fetch<SanityLocalExperience[]>(featuredLocalExperiencesQuery);
    return result.length > 0 ? result.map(toLocalExperience) : staticExperiences.filter((a) => a.featured);
  } catch {
    return staticExperiences.filter((a) => a.featured);
  }
}

/** Full list shown on /explore-the-area, grouped/filterable by category. */
export async function getAllExperiences(): Promise<LocalExperience[]> {
  if (!process.env.NEXT_PUBLIC_SANITY_PROJECT_ID) {
    return staticExperiences;
  }
  try {
    const result = await sanityClient.fetch<SanityLocalExperience[]>(allLocalExperiencesQuery);
    return result.length > 0 ? result.map(toLocalExperience) : staticExperiences;
  } catch {
    return staticExperiences;
  }
}

/** Single experience by slug, for /explore-the-area/[slug]. */
export async function getExperienceBySlug(slug: string): Promise<LocalExperience | null> {
  if (!process.env.NEXT_PUBLIC_SANITY_PROJECT_ID) {
    return staticExperiences.find((a) => a.slug === slug) ?? null;
  }
  try {
    const result = await sanityClient.fetch<SanityLocalExperience | null>(localExperienceBySlugQuery, { slug });
    return result ? toLocalExperience(result) : staticExperiences.find((a) => a.slug === slug) ?? null;
  } catch {
    return staticExperiences.find((a) => a.slug === slug) ?? null;
  }
}

/**
 * Groups experiences into one TaxonomyType per category so the homepage can
 * reuse SectionSliderNewCategories' carousel as-is (it already accepts
 * generic TaxonomyType[] — no need for a bespoke category-carousel
 * component) instead of the old per-city taxonomy. Category names get their
 * emoji prefixed here so the carousel card itself doesn't need to know
 * anything about the category taxonomy.
 */
export function getExperienceCategoryTaxonomies(experiences: LocalExperience[]): TaxonomyType[] {
  const byCategory = new Map<string, LocalExperience[]>();
  for (const a of experiences) {
    const list = byCategory.get(a.category) ?? [];
    list.push(a);
    byCategory.set(a.category, list);
  }

  return Array.from(byCategory.entries()).map(([category, items]) => ({
    id: category,
    name: `${CATEGORY_EMOJI[category] ?? ""} ${category}`.trim(),
    href: `/explore-the-area?category=${encodeURIComponent(category)}` as Route,
    count: items.length,
    thumbnail: items[0]?.imageUrl,
    taxonomy: "category" as const,
  }));
}
