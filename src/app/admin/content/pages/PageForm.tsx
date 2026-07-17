"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createPage, updatePage, type PageFormInput } from "@/modules/cms/actions";
import { blocksToPlainText } from "@/modules/cms/portable-text";
import type { CmsPageDetail } from "@/modules/cms/queries";

export default function PageForm({ page }: { page?: CmsPageDetail }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState(page?.title ?? "");
  const [slug, setSlug] = useState(page?.slug ?? "");
  const [bodyText, setBodyText] = useState(() => blocksToPlainText(page?.body));
  const [metaTitle, setMetaTitle] = useState(page?.seo?.metaTitle ?? "");
  const [metaDescription, setMetaDescription] = useState(page?.seo?.metaDescription ?? "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const input: PageFormInput = { title, slug, bodyText, metaTitle, metaDescription };
    startTransition(async () => {
      const result = page ? await updatePage(page._id, input) : await createPage(input);
      if (!result.success) {
        setError(result.error.message);
        return;
      }
      router.push("/admin/content/pages" as never);
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
        <input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} required />
      </div>

      <div>
        <label className={labelClass}>URL slug (optional — auto-generated from title if left blank)</label>
        <input
          className={inputClass}
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder="about"
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
          {isPending ? "Saving..." : page ? "Save changes" : "Create page"}
        </button>
      </div>
    </form>
  );
}
