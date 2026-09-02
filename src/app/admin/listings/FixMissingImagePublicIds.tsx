"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { backfillMissingImagePublicIds } from "@/modules/admin/actions";

/**
 * One-off repair button for the missing-publicId bug (images added via an
 * earlier version of addListingImages() before it stored publicId) — that
 * bug blocked editing any listing whose gallery included one of those rows,
 * since the add-listing form's validation requires every image to have a
 * publicId. Safe to click more than once. Remove this component (and its
 * mount in page.tsx) once confirmed fixed.
 */
export default function FixMissingImagePublicIds() {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<string | null>(null);
  const router = useRouter();

  function handleClick() {
    setResult(null);
    startTransition(async () => {
      const res = await backfillMissingImagePublicIds();
      if (!res.success) {
        setResult(res.error.message);
        return;
      }
      setResult(`Fixed ${res.data.count} image${res.data.count === 1 ? "" : "s"} missing a publicId.`);
      router.refresh();
    });
  }

  return (
    <div className="mb-4 flex items-center gap-3">
      <button
        onClick={handleClick}
        disabled={isPending}
        className="px-3 py-1.5 text-xs rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 disabled:opacity-50"
      >
        {isPending ? "Fixing..." : "Fix images missing a publicId"}
      </button>
      {result && <span className="text-xs text-neutral-500 dark:text-neutral-400">{result}</span>}
    </div>
  );
}
