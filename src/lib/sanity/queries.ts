import { groq } from "next-sanity";

export const allPostsQuery = groq`
  *[_type == "post" && defined(publishedAt) && publishedAt <= now()] | order(publishedAt desc) {
    _id,
    title,
    slug,
    excerpt,
    publishedAt,
    mainImage,
    "categories": categories[]->{ title, slug },
    "author": author->{ name, slug, image },
    "estimatedReadingTime": round(length(pt::text(body)) / 5 / 200)
  }
`;

export const postBySlugQuery = groq`
  *[_type == "post" && slug.current == $slug][0] {
    _id,
    title,
    slug,
    excerpt,
    publishedAt,
    mainImage,
    body,
    seo,
    "categories": categories[]->{ title, slug },
    "author": author->{ name, slug, image, bio },
    "estimatedReadingTime": round(length(pt::text(body)) / 5 / 200)
  }
`;

export const postSlugsQuery = groq`
  *[_type == "post" && defined(publishedAt) && publishedAt <= now()] {
    "slug": slug.current
  }
`;

export const allCategoriesQuery = groq`
  *[_type == "category"] | order(title asc) {
    _id,
    title,
    slug
  }
`;

export const postsByCategoryQuery = groq`
  *[_type == "post" && defined(publishedAt) && publishedAt <= now() && $categorySlug in categories[]->slug.current] | order(publishedAt desc) {
    _id,
    title,
    slug,
    excerpt,
    publishedAt,
    mainImage,
    "categories": categories[]->{ title, slug },
    "author": author->{ name, slug, image },
    "estimatedReadingTime": round(length(pt::text(body)) / 5 / 200)
  }
`;

export const pageBySlugQuery = groq`
  *[_type == "page" && slug.current == $slug][0] {
    _id,
    title,
    slug,
    body,
    seo
  }
`;

export const sitemapPostsQuery = groq`
  *[_type == "post" && defined(publishedAt) && publishedAt <= now()] | order(publishedAt desc) {
    "slug": slug.current,
    publishedAt,
    _updatedAt
  }
`;
