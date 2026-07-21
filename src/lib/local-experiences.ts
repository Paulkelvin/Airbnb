import { sanityClient } from "@/lib/sanity/client";
import {
  featuredLocalExperiencesQuery,
  allLocalExperiencesQuery,
  localExperienceBySlugQuery,
} from "@/lib/sanity/queries";
import {
  localExperiences as staticExperiences,
  type LocalExperience,
} from "@/data/local-experiences";

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
