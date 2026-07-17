"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createPost, updatePost, type PostFormInput } from "@/modules/cms/actions";
import { blocksToPlainText } from "@/modules/cms/portable-text";
import type { CmsAuthorItem, CmsCategoryItem, CmsPostDetail } from "@/modules/cms/queries";

function toDateInputValue(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toISOString().slice(0, 10);
}

export default function PostForm({
  post,
  authors,
  categories,
}: {
  post?: CmsPostDetail;
  authors: CmsAuthorItem[];
  categories: CmsCategoryItem[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState(post?.title ?? "");
  const [slug, setSlug] = useState(post?.slug ?? "");
  const [authorId, setAuthorId] = useState(post?.authorId ?? "");
  const [categoryIds, setCategoryIds] = useState<string[]>(post?.categoryIds ?? []);
  const [excerpt, setExcerpt] = useState(post?.excerpt ?? "");
  const [bodyText, setBodyText] = useState(() => blocksToPlainText(post?.body));
  const [published, setPublished] = useState(Boolean(post?.publishedAt));
  const [publishDate, setPublishDate] = useState(
    toDateInputValue(post?.publishedAt ?? new Date().toISOString()),
  );
  const [metaTitle, setMetaTitle] = useState(post?.seo?.metaTitle ?? "");
  const [metaDescription, setMetaDescription] = useState(post?.seo?.metaDescription ?? "");

  function toggleCategory(id: string) {
    setCategoryIds((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const input: PostFormInput = {
      title,
      slug,
      authorId: authorId || undefined,
      categoryIds,
      excerpt,
      bodyText,
      publishedAt: published ? new Date(publishDate).toISOString() : null,
      metaTitle,
      metaDescription,
    };
    startTransition(async () => {
      const result = post ? await updatePost(post._id, input) : await createPost(input);
      if (!result.success) {
        setError(result.error.message);
        return;
      }
      router.push("/admin/content/posts" as never);
      router.refresh();
    });
  }

  const inputClass =
    "w-full px-3 py-2 text-sm border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100";
  const labelClass = "block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5";

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
      {error && (
        <div className="rounded-lg bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 text-sm px-4 py-3">
          {error}
        </div>
      )}

      <div>
        <label className={labelClass}>Title</label>
        <input
          className={inputClass}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </div>

      <div>
        <label className={labelClass}>Slug (optional — auto-generated from title if left blank)</label>
        <input
          className={inputClass}
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder="my-post-title"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Author</label>
          <select className={inputClass} value={authorId} onChange={(e) => setAuthorId(e.target.value)}>
            <option value="">No author</option>
            {authors.map((a) => (
              <option key={a._id} value={a._id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Categories</label>
          <div className="flex flex-wrap gap-2 pt-1">
            {categories.length === 0 && (
              <span className="text-sm text-neutral-400">No categories yet</span>
            )}
            {categories.map((c) => (
              <button
                key={c._id}
                type="button"
                onClick={() => toggleCategory(c._id)}
                className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                  categoryIds.includes(c._id)
                    ? "bg-primary-6000 text-white border-primary-6000"
                    : "border-neutral-300 dark:border-neutral-600 text-neutral-600 dark:text-neutral-300"
                }`}
              >
                {c.title}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div>
        <label className={labelClass}>Excerpt</label>
        <textarea
          className={inputClass}
          rows={2}
          value={excerpt}
          onChange={(e) => setExcerpt(e.target.value)}
          maxLength={300}
          placeholder="Short summary shown on the blog listing page"
        />
      </div>

      <div>
        <label className={labelClass}>Body</label>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-2">
          Blank line = new paragraph. <code>## </code> for a heading, <code>### </code> for a
          subheading, <code>- </code> for a bullet point.
        </p>
        <textarea
          className={`${inputClass} font-mono`}
          rows={16}
          value={bodyText}
          onChange={(e) => setBodyText(e.target.value)}
        />
      </div>

      <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 p-4 space-y-3">
        <label className="flex items-center gap-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
          <input
            type="checkbox"
            checked={published}
            onChange={(e) => setPublished(e.target.checked)}
          />
          Published
        </label>
        {published && (
          <div>
            <label className={labelClass}>Publish date</label>
            <input
              type="date"
              className={inputClass}
              value={publishDate}
              onChange={(e) => setPublishDate(e.target.value)}
            />
          </div>
        )}
      </div>

      <details className="rounded-lg border border-neutral-200 dark:border-neutral-700 p-4">
        <summary className="text-sm font-medium text-neutral-700 dark:text-neutral-300 cursor-pointer">
          SEO
        </summary>
        <div className="mt-4 space-y-4">
          <div>
            <label className={labelClass}>Meta title</label>
            <input
              className={inputClass}
              value={metaTitle}
              onChange={(e) => setMetaTitle(e.target.value)}
              maxLength={60}
            />
          </div>
          <div>
            <label className={labelClass}>Meta description</label>
            <textarea
              className={inputClass}
              rows={2}
              value={metaDescription}
              onChange={(e) => setMetaDescription(e.target.value)}
              maxLength={160}
            />
          </div>
        </div>
      </details>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="px-5 py-2.5 text-sm font-medium rounded-lg bg-primary-6000 text-white hover:bg-primary-700 disabled:opacity-50"
        >
          {isPending ? "Saving..." : post ? "Save changes" : "Create post"}
        </button>
      </div>
    </form>
  );
}
