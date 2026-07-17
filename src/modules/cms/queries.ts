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
