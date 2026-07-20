"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import type { ActionResult } from "@/lib/validations/auth";
import { sanityAdminClient } from "./sanity-admin-client";
import { plainTextToBlocks } from "./portable-text";
import { ABOUT_PAGE_ID } from "./queries";

function slugify(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function fail<T>(message: string): ActionResult<T> {
  return { success: false, error: { code: "VALIDATION_ERROR", message } };
}

// ---------- Posts ----------

export interface PostFormInput {
  title: string;
  slug?: string;
  authorId?: string;
  categoryIds: string[];
  excerpt: string;
  bodyText: string;
  publishedAt: string | null;
  metaTitle?: string;
  metaDescription?: string;
}

export async function createPost(input: PostFormInput): Promise<ActionResult<{ id: string }>> {
  await requireAdmin();
  if (!input.title.trim()) return fail("Title is required");

  const slug = slugify(input.slug || input.title);
  const doc = await sanityAdminClient.create({
    _type: "post",
    title: input.title.trim(),
    slug: { _type: "slug", current: slug },
    author: input.authorId ? { _type: "reference", _ref: input.authorId } : undefined,
    categories: input.categoryIds.map((id) => ({ _type: "reference", _ref: id, _key: id })),
    excerpt: input.excerpt.trim() || undefined,
    body: plainTextToBlocks(input.bodyText),
    publishedAt: input.publishedAt,
    seo: {
      metaTitle: input.metaTitle?.trim() || undefined,
      metaDescription: input.metaDescription?.trim() || undefined,
    },
  });

  revalidatePath("/blog");
  revalidatePath(`/blog/${slug}`);
  revalidatePath("/sitemap.xml");
  revalidatePath("/admin/content/posts");

  return { success: true, data: { id: doc._id } };
}

export async function updatePost(
  id: string,
  input: PostFormInput,
): Promise<ActionResult<{ id: string }>> {
  await requireAdmin();
  if (!input.title.trim()) return fail("Title is required");

  const slug = slugify(input.slug || input.title);
  await sanityAdminClient
    .patch(id)
    .set({
      title: input.title.trim(),
      slug: { _type: "slug", current: slug },
      author: input.authorId ? { _type: "reference", _ref: input.authorId } : undefined,
      categories: input.categoryIds.map((catId) => ({ _type: "reference", _ref: catId, _key: catId })),
      excerpt: input.excerpt.trim() || undefined,
      body: plainTextToBlocks(input.bodyText),
      publishedAt: input.publishedAt,
      seo: {
        metaTitle: input.metaTitle?.trim() || undefined,
        metaDescription: input.metaDescription?.trim() || undefined,
      },
    })
    .commit();

  revalidatePath("/blog");
  revalidatePath(`/blog/${slug}`);
  revalidatePath("/sitemap.xml");
  revalidatePath("/admin/content/posts");

  return { success: true, data: { id } };
}

export async function deletePost(id: string): Promise<ActionResult<{ id: string }>> {
  await requireAdmin();
  await sanityAdminClient.delete(id);
  revalidatePath("/blog");
  revalidatePath("/sitemap.xml");
  revalidatePath("/admin/content/posts");
  return { success: true, data: { id } };
}

// ---------- Pages ----------

export interface PageFormInput {
  title: string;
  slug?: string;
  bodyText: string;
  metaTitle?: string;
  metaDescription?: string;
}

export async function createPage(input: PageFormInput): Promise<ActionResult<{ id: string }>> {
  await requireAdmin();
  if (!input.title.trim()) return fail("Title is required");

  const slug = slugify(input.slug || input.title);
  const doc = await sanityAdminClient.create({
    _type: "page",
    title: input.title.trim(),
    slug: { _type: "slug", current: slug },
    body: plainTextToBlocks(input.bodyText),
    seo: {
      metaTitle: input.metaTitle?.trim() || undefined,
      metaDescription: input.metaDescription?.trim() || undefined,
    },
  });

  revalidatePath(`/${slug}`);
  revalidatePath("/admin/content/pages");

  return { success: true, data: { id: doc._id } };
}

export async function updatePage(
  id: string,
  input: PageFormInput,
): Promise<ActionResult<{ id: string }>> {
  await requireAdmin();
  if (!input.title.trim()) return fail("Title is required");

  const slug = slugify(input.slug || input.title);
  await sanityAdminClient
    .patch(id)
    .set({
      title: input.title.trim(),
      slug: { _type: "slug", current: slug },
      body: plainTextToBlocks(input.bodyText),
      seo: {
        metaTitle: input.metaTitle?.trim() || undefined,
        metaDescription: input.metaDescription?.trim() || undefined,
      },
    })
    .commit();

  revalidatePath(`/${slug}`);
  revalidatePath("/admin/content/pages");

  return { success: true, data: { id } };
}

export async function deletePage(id: string): Promise<ActionResult<{ id: string }>> {
  await requireAdmin();
  await sanityAdminClient.delete(id);
  revalidatePath("/admin/content/pages");
  return { success: true, data: { id } };
}

// ---------- Categories ----------

export async function createCategory(input: {
  title: string;
  description?: string;
}): Promise<ActionResult<{ id: string }>> {
  await requireAdmin();
  if (!input.title.trim()) return fail("Title is required");
  const doc = await sanityAdminClient.create({
    _type: "category",
    title: input.title.trim(),
    slug: { _type: "slug", current: slugify(input.title) },
    description: input.description?.trim() || undefined,
  });
  revalidatePath("/blog");
  revalidatePath("/admin/content/categories-authors");
  return { success: true, data: { id: doc._id } };
}

export async function updateCategory(
  id: string,
  input: { title: string; description?: string },
): Promise<ActionResult<{ id: string }>> {
  await requireAdmin();
  if (!input.title.trim()) return fail("Title is required");
  await sanityAdminClient
    .patch(id)
    .set({
      title: input.title.trim(),
      slug: { _type: "slug", current: slugify(input.title) },
      description: input.description?.trim() || undefined,
    })
    .commit();
  revalidatePath("/blog");
  revalidatePath("/admin/content/categories-authors");
  return { success: true, data: { id } };
}

export async function deleteCategory(id: string): Promise<ActionResult<{ id: string }>> {
  await requireAdmin();
  await sanityAdminClient.delete(id);
  revalidatePath("/blog");
  revalidatePath("/admin/content/categories-authors");
  return { success: true, data: { id } };
}

// ---------- Authors ----------

export async function createAuthor(input: {
  name: string;
  bio?: string;
}): Promise<ActionResult<{ id: string }>> {
  await requireAdmin();
  if (!input.name.trim()) return fail("Name is required");
  const doc = await sanityAdminClient.create({
    _type: "author",
    name: input.name.trim(),
    slug: { _type: "slug", current: slugify(input.name) },
    bio: input.bio?.trim() || undefined,
  });
  revalidatePath("/admin/content/categories-authors");
  return { success: true, data: { id: doc._id } };
}

export async function updateAuthor(
  id: string,
  input: { name: string; bio?: string },
): Promise<ActionResult<{ id: string }>> {
  await requireAdmin();
  if (!input.name.trim()) return fail("Name is required");
  await sanityAdminClient
    .patch(id)
    .set({
      name: input.name.trim(),
      slug: { _type: "slug", current: slugify(input.name) },
      bio: input.bio?.trim() || undefined,
    })
    .commit();
  revalidatePath("/admin/content/categories-authors");
  return { success: true, data: { id } };
}

export async function deleteAuthor(id: string): Promise<ActionResult<{ id: string }>> {
  await requireAdmin();
  await sanityAdminClient.delete(id);
  revalidatePath("/admin/content/categories-authors");
  return { success: true, data: { id } };
}

// ---------- FAQ ----------

export interface FaqFormInput {
  question: string;
  answer: string;
  category: string;
  order: number;
}

export async function createFaq(input: FaqFormInput): Promise<ActionResult<{ id: string }>> {
  await requireAdmin();
  if (!input.question.trim() || !input.answer.trim() || !input.category.trim()) {
    return fail("Question, answer, and category are all required");
  }
  const doc = await sanityAdminClient.create({
    _type: "faq",
    question: input.question.trim(),
    answer: input.answer.trim(),
    category: input.category.trim(),
    order: input.order,
  });
  revalidatePath("/faq");
  revalidatePath("/admin/content/faq");
  return { success: true, data: { id: doc._id } };
}

export async function updateFaq(
  id: string,
  input: FaqFormInput,
): Promise<ActionResult<{ id: string }>> {
  await requireAdmin();
  if (!input.question.trim() || !input.answer.trim() || !input.category.trim()) {
    return fail("Question, answer, and category are all required");
  }
  await sanityAdminClient
    .patch(id)
    .set({
      question: input.question.trim(),
      answer: input.answer.trim(),
      category: input.category.trim(),
      order: input.order,
    })
    .commit();
  revalidatePath("/faq");
  revalidatePath("/admin/content/faq");
  return { success: true, data: { id } };
}

export async function deleteFaq(id: string): Promise<ActionResult<{ id: string }>> {
  await requireAdmin();
  await sanityAdminClient.delete(id);
  revalidatePath("/faq");
  revalidatePath("/admin/content/faq");
  return { success: true, data: { id } };
}

// ---------- Attractions ----------

export interface AttractionFormInput {
  title: string;
  category: string;
  description: string;
  imageUrl: string;
  distanceLabel: string;
  externalUrl?: string;
  featured: boolean;
  order: number;
  publishedAt: string | null;
}

export async function createAttraction(
  input: AttractionFormInput,
): Promise<ActionResult<{ id: string }>> {
  await requireAdmin();
  if (!input.title.trim() || !input.category.trim() || !input.imageUrl.trim()) {
    return fail("Title, category, and image URL are all required");
  }
  const doc = await sanityAdminClient.create({
    _type: "attraction",
    title: input.title.trim(),
    category: input.category.trim(),
    description: input.description.trim(),
    imageUrl: input.imageUrl.trim(),
    distanceLabel: input.distanceLabel.trim(),
    externalUrl: input.externalUrl?.trim() || undefined,
    featured: input.featured,
    order: input.order,
    publishedAt: input.publishedAt,
  });

  revalidatePath("/");
  revalidatePath("/explore-the-area");
  revalidatePath("/admin/content/attractions");

  return { success: true, data: { id: doc._id } };
}

export async function updateAttraction(
  id: string,
  input: AttractionFormInput,
): Promise<ActionResult<{ id: string }>> {
  await requireAdmin();
  if (!input.title.trim() || !input.category.trim() || !input.imageUrl.trim()) {
    return fail("Title, category, and image URL are all required");
  }
  await sanityAdminClient
    .patch(id)
    .set({
      title: input.title.trim(),
      category: input.category.trim(),
      description: input.description.trim(),
      imageUrl: input.imageUrl.trim(),
      distanceLabel: input.distanceLabel.trim(),
      externalUrl: input.externalUrl?.trim() || undefined,
      featured: input.featured,
      order: input.order,
      publishedAt: input.publishedAt,
    })
    .commit();

  revalidatePath("/");
  revalidatePath("/explore-the-area");
  revalidatePath("/admin/content/attractions");

  return { success: true, data: { id } };
}

export async function deleteAttraction(id: string): Promise<ActionResult<{ id: string }>> {
  await requireAdmin();
  await sanityAdminClient.delete(id);
  revalidatePath("/");
  revalidatePath("/explore-the-area");
  revalidatePath("/admin/content/attractions");
  return { success: true, data: { id } };
}

// ---------- About page (singleton) ----------

export interface AboutPageFormInput {
  heroTitle: string;
  heroSubtitle: string;
  heroBodyText: string;
  stats: { label: string; value: string }[];
  missionTitle: string;
  missionBodyText: string;
  valuesTitle: string;
  valuesSubtitle: string;
  values: { title: string; description: string }[];
  ctaTitle: string;
  ctaSubtitle: string;
}

export async function saveAboutPage(input: AboutPageFormInput): Promise<ActionResult<{ id: string }>> {
  await requireAdmin();
  if (!input.heroTitle.trim()) return fail("Hero title is required");

  await sanityAdminClient.createOrReplace({
    _id: ABOUT_PAGE_ID,
    _type: "aboutPage",
    heroTitle: input.heroTitle.trim(),
    heroSubtitle: input.heroSubtitle.trim() || undefined,
    heroBody: plainTextToBlocks(input.heroBodyText),
    stats: input.stats
      .filter((s) => s.label.trim() && s.value.trim())
      .map((s) => ({ _type: "stat", _key: cryptoKey(), label: s.label.trim(), value: s.value.trim() })),
    missionTitle: input.missionTitle.trim() || undefined,
    missionBody: plainTextToBlocks(input.missionBodyText),
    valuesTitle: input.valuesTitle.trim() || undefined,
    valuesSubtitle: input.valuesSubtitle.trim() || undefined,
    values: input.values
      .filter((v) => v.title.trim())
      .map((v) => ({
        _type: "value",
        _key: cryptoKey(),
        title: v.title.trim(),
        description: v.description.trim(),
      })),
    ctaTitle: input.ctaTitle.trim() || undefined,
    ctaSubtitle: input.ctaSubtitle.trim() || undefined,
  });

  revalidatePath("/about");
  revalidatePath("/admin/content/about");
  return { success: true, data: { id: ABOUT_PAGE_ID } };
}

function cryptoKey(): string {
  return Math.random().toString(36).slice(2, 10);
}
