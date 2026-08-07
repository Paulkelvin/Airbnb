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
    "estimatedReadingTime": select(round(length(pt::text(body)) / 5 / 200) < 1 => 1, round(length(pt::text(body)) / 5 / 200))
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
    "estimatedReadingTime": select(round(length(pt::text(body)) / 5 / 200) < 1 => 1, round(length(pt::text(body)) / 5 / 200))
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
    "estimatedReadingTime": select(round(length(pt::text(body)) / 5 / 200) < 1 => 1, round(length(pt::text(body)) / 5 / 200))
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

export const allFaqsQuery = groq`
  *[_type == "faq"] | order(category asc, order asc) {
    _id, question, answer, category
  }
`;

export const aboutPageQuery = groq`
  *[_type == "aboutPage"][0] {
    heroTitle,
    heroSubtitle,
    heroBody,
    stats,
    missionTitle,
    missionBody,
    missionImageUrl,
    valuesTitle,
    valuesSubtitle,
    values,
    ctaTitle,
    ctaSubtitle
  }
`;

const localExperienceFields = `
  _id, title, "slug": slug.current, category, tagline, description, imageUrl,
  galleryImageUrls, distanceLabel, latitude, longitude, openingHours,
  websiteUrl, featured
`;

export const featuredLocalExperiencesQuery = groq`
  *[_type == "localExperience" && defined(publishedAt) && publishedAt <= now() && featured == true] | order(order asc) {
    ${localExperienceFields}
  }
`;

export const allLocalExperiencesQuery = groq`
  *[_type == "localExperience" && defined(publishedAt) && publishedAt <= now()] | order(category asc, order asc) {
    ${localExperienceFields}
  }
`;

export const localExperienceBySlugQuery = groq`
  *[_type == "localExperience" && slug.current == $slug && defined(publishedAt) && publishedAt <= now()][0] {
    ${localExperienceFields}
  }
`;

export const sitemapPostsQuery = groq`
  *[_type == "post" && defined(publishedAt) && publishedAt <= now()] | order(publishedAt desc) {
    "slug": slug.current,
    publishedAt,
    _updatedAt
  }
`;
