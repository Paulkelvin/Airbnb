"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import type { ActionResult } from "@/lib/validations/auth";
import { sanityAdminClient } from "./sanity-admin-client";
import { plainTextToBlocks } from "./portable-text";

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
