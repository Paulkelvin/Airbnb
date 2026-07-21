import { groq } from "next-sanity";
import { sanityAdminClient as sanityClient } from "./sanity-admin-client";

export interface CmsPostListItem {
  _id: string;
  title: string;
  slug: string;
  publishedAt: string | null;
  authorName: string | null;
}

export interface CmsPageListItem {
  _id: string;
  title: string;
  slug: string;
}

export interface CmsCategoryItem {
  _id: string;
  title: string;
  slug: string;
  description: string | null;
}

export interface CmsAuthorItem {
  _id: string;
  name: string;
  slug: string;
  bio: string | null;
}

export interface CmsPostDetail extends CmsPostListItem {
  authorId: string | null;
  categoryIds: string[];
  excerpt: string | null;
  body: unknown;
  mainImage: unknown;
  seo: { metaTitle?: string; metaDescription?: string } | null;
}

export interface CmsPageDetail extends CmsPageListItem {
  body: unknown;
  seo: { metaTitle?: string; metaDescription?: string } | null;
}

// Admin views show every document regardless of publish date — unlike the
// public-facing queries in src/lib/sanity/queries.ts, which filter to
// published-and-past content only.
export async function getAdminPosts(): Promise<CmsPostListItem[]> {
  return sanityClient.fetch(groq`
    *[_type == "post"] | order(coalesce(publishedAt, _createdAt) desc) {
      _id,
      title,
      "slug": slug.current,
      publishedAt,
      "authorName": author->name
    }
  `);
}

export async function getAdminPost(id: string): Promise<CmsPostDetail | null> {
  return sanityClient.fetch(
    groq`*[_type == "post" && _id == $id][0] {
      _id,
      title,
      "slug": slug.current,
      publishedAt,
      "authorName": author->name,
      "authorId": author._ref,
      "categoryIds": categories[]._ref,
      excerpt,
      body,
      mainImage,
      seo
    }`,
    { id },
  );
}

export async function getAdminPages(): Promise<CmsPageListItem[]> {
  return sanityClient.fetch(groq`
    *[_type == "page"] | order(title asc) {
      _id,
      title,
      "slug": slug.current
    }
  `);
}

export async function getAdminPage(id: string): Promise<CmsPageDetail | null> {
  return sanityClient.fetch(
    groq`*[_type == "page" && _id == $id][0] {
      _id,
      title,
      "slug": slug.current,
      body,
      seo
    }`,
    { id },
  );
}

export async function getAdminCategories(): Promise<CmsCategoryItem[]> {
  return sanityClient.fetch(groq`
    *[_type == "category"] | order(title asc) {
      _id, title, "slug": slug.current, description
    }
  `);
}

export async function getAdminAuthors(): Promise<CmsAuthorItem[]> {
  return sanityClient.fetch(groq`
    *[_type == "author"] | order(name asc) {
      _id, name, "slug": slug.current, bio
    }
  `);
}

// ---------- FAQ ----------

export interface CmsFaqItem {
  _id: string;
  question: string;
  answer: string;
  category: string;
  order: number;
}

export async function getAdminFaqs(): Promise<CmsFaqItem[]> {
  return sanityClient.fetch(groq`
    *[_type == "faq"] | order(category asc, order asc) {
      _id, question, answer, category, order
    }
  `);
}

export async function getAdminFaq(id: string): Promise<CmsFaqItem | null> {
  return sanityClient.fetch(
    groq`*[_type == "faq" && _id == $id][0] { _id, question, answer, category, order }`,
    { id },
  );
}

// ---------- Local Experiences ----------

const adminLocalExperienceFields = `
  _id, title, "slug": slug.current, category, tagline, description, imageUrl,
  galleryImageUrls, distanceLabel, latitude, longitude, openingHours,
  websiteUrl, featured, order, publishedAt
`;

export interface CmsLocalExperienceItem {
  _id: string;
  title: string;
  slug: string;
  category: string;
  tagline: string;
  description: string;
  imageUrl: string;
  galleryImageUrls: string[];
  distanceLabel: string;
  latitude: number | null;
  longitude: number | null;
  openingHours: string | null;
  websiteUrl: string | null;
  featured: boolean;
  order: number;
  publishedAt: string | null;
}

export async function getAdminLocalExperiences(): Promise<CmsLocalExperienceItem[]> {
  return sanityClient.fetch(groq`
    *[_type == "localExperience"] | order(category asc, order asc) {
      ${adminLocalExperienceFields}
    }
  `);
}

export async function getAdminLocalExperience(id: string): Promise<CmsLocalExperienceItem | null> {
  return sanityClient.fetch(
    groq`*[_type == "localExperience" && _id == $id][0] {
      ${adminLocalExperienceFields}
    }`,
    { id },
  );
}

// ---------- About page (singleton) ----------

export const ABOUT_PAGE_ID = "aboutPage-singleton";

export interface CmsAboutPage {
  _id: string;
  heroTitle: string;
  heroSubtitle: string | null;
  heroBody: unknown;
  stats: { label: string; value: string }[];
  missionTitle: string | null;
  missionBody: unknown;
  missionImage: unknown;
  valuesTitle: string | null;
  valuesSubtitle: string | null;
  values: { title: string; description: string }[];
  ctaTitle: string | null;
  ctaSubtitle: string | null;
}

export async function getAdminAboutPage(): Promise<CmsAboutPage | null> {
  return sanityClient.fetch(groq`*[_type == "aboutPage" && _id == $id][0]`, { id: ABOUT_PAGE_ID });
}
