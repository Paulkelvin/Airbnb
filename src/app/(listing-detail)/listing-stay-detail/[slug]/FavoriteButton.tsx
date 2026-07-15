"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleFavorite } from "@/modules/favorites/actions";
import type { Route } from "@/routers/types";

export default function FavoriteButton({
  listingId,
  isAuthenticated,
  initiallyFavorited,
}: {
  listingId: string;
  isAuthenticated: boolean;
  initiallyFavorited: boolean;
}) {
  const router = useRouter();
  const [favorited, setFavorited] = useState(initiallyFavorited);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!isAuthenticated) {
      router.push("/login" as Route);
      return;
    }
    startTransition(async () => {
      const result = await toggleFavorite(listingId);
      if (result.success) setFavorited(result.data.favorited);
    });
  }

  return (
    <div className="flow-root">
      <div className="flex text-neutral-700 dark:text-neutral-300 text-sm -mx-3 -my-1.5">
        <span className="py-1.5 px-3 flex rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
            />
          </svg>
          <span className="hidden sm:block ml-2.5">Share</span>
        </span>
        <button
          type="button"
          disabled={isPending}
          onClick={handleClick}
          className="py-1.5 px-3 flex rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer disabled:opacity-60"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`h-5 w-5 ${favorited ? "text-rose-600" : ""}`}
            fill={favorited ? "currentColor" : "none"}
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
            />
          </svg>
          <span className="hidden sm:block ml-2.5">{favorited ? "Saved" : "Save"}</span>
        </button>
      </div>
    </div>
  );
}
