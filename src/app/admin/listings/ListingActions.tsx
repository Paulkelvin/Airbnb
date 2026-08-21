"use client";

import React, { useState, useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ConfirmModal from "@/components/ui/ConfirmModal";
import {
  approveListing,
  rejectListing,
  adminUnpublishListing,
  adminDeleteListing,
  addListingImages,
} from "@/modules/admin/actions";

// One-off: 6 new cottage photos to add to the primary listing's gallery.
// Remove this NEW_PHOTOS constant and the button below once they're added.
const NEW_PHOTOS = [
  { url: "https://res.cloudinary.com/lbwzvp5s/image/upload/v1787327171/potomac/listings/dock-chairs-dusk.jpg", altText: "Adirondack chairs by the dock at dusk", category: "Waterfront" },
  { url: "https://res.cloudinary.com/lbwzvp5s/image/upload/v1787327172/potomac/listings/firepit-chairs-day.jpg", altText: "Fire pit and chairs overlooking the water", category: "Outdoor" },
  { url: "https://res.cloudinary.com/lbwzvp5s/image/upload/v1787327174/potomac/listings/firepit-chairs-clearsky.jpg", altText: "Fire pit and chairs on a clear day", category: "Outdoor" },
  { url: "https://res.cloudinary.com/lbwzvp5s/image/upload/v1787327172/potomac/listings/bonfire-night.jpg", altText: "Bonfire at night by the water", category: "Outdoor" },
  { url: "https://res.cloudinary.com/lbwzvp5s/image/upload/v1787327173/potomac/listings/dogs-paddleboard.jpg", altText: "Dogs on a paddleboard on the water", category: "Waterfront" },
  { url: "https://res.cloudinary.com/lbwzvp5s/image/upload/v1787327170/potomac/listings/dog-deck-waterview.jpg", altText: "Dog resting on the deck overlooking the water", category: "Outdoor" },
];

export function ListingActions({
  listingId,
  status,
}: {
  listingId: string;
  status: string;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleAction(action: () => Promise<unknown>) {
    startTransition(async () => {
      await action();
      router.refresh();
    });
  }

  function handleActionWithReason(
    action: (reason?: string) => Promise<unknown>,
    promptText: string,
  ) {
    const reason = window.prompt(promptText) ?? undefined;
    if (reason === undefined) return;
    handleAction(() => action(reason.trim() || undefined));
  }

  return (
    <div className="flex gap-1 flex-wrap">
      <Link
        href={`/add-listing/${listingId}` as never}
        className="px-2 py-1 text-xs rounded bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
      >
        Edit
      </Link>
      {status === "PENDING_REVIEW" && (
        <>
          <button
            onClick={() => handleAction(() => approveListing(listingId))}
            disabled={isPending}
            className="px-2 py-1 text-xs rounded bg-green-50 text-green-600 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/40 disabled:opacity-50"
          >
            Approve
          </button>
          <button
            onClick={() =>
              handleActionWithReason(
                (reason) => rejectListing(listingId, reason),
                "Reason for rejecting this listing (shown to the host, optional):",
              )
            }
            disabled={isPending}
            className="px-2 py-1 text-xs rounded bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40 disabled:opacity-50"
          >
            Reject
          </button>
        </>
      )}
      {status === "PUBLISHED" && (
        <button
          onClick={() =>
            handleActionWithReason(
              (reason) => adminUnpublishListing(listingId, reason),
              "Reason for unpublishing this listing (logged internally, optional):",
            )
          }
          disabled={isPending}
          className="px-2 py-1 text-xs rounded bg-yellow-50 text-yellow-600 hover:bg-yellow-100 dark:bg-yellow-900/20 dark:text-yellow-400 dark:hover:bg-yellow-900/40 disabled:opacity-50"
        >
          Unpublish
        </button>
      )}
      <button
        onClick={() => {
          if (!window.confirm("Permanently delete this listing? This cannot be undone.")) return;
          handleAction(() => adminDeleteListing(listingId));
        }}
        disabled={isPending}
        className="px-2 py-1 text-xs rounded bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40 disabled:opacity-50"
      >
        Delete
      </button>
      <button
        onClick={() => handleAction(() => addListingImages(listingId, NEW_PHOTOS))}
        disabled={isPending}
        className="px-2 py-1 text-xs rounded bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/40 disabled:opacity-50"
      >
        Import 6 new photos
      </button>
    </div>
  );
}
