"use client";

import { useState, useCallback, useTransition } from "react";
import Image from "next/image";
import Badge from "@/components/ui/Badge";
import ButtonSecondary from "@/components/ui/ButtonSecondary";
import ConfirmModal from "@/components/ui/ConfirmModal";
import {
  publishListing,
  unpublishListing,
  archiveListing,
} from "@/modules/listings/actions";
import type { TwMainColor } from "@/data/types";
import type { Route } from "@/routers/types";

export interface ListingRow {
  id: string;
  slug: string;
  title: string;
  status: string;
  rentalType: string;
  price: string;
  coverImageUrl: string | null;
  updatedAt: string;
}

const STATUS_COLOR: Record<string, TwMainColor> = {
  DRAFT: "gray",
  PENDING_REVIEW: "yellow",
  PUBLISHED: "green",
  PAUSED: "yellow",
  ARCHIVED: "red",
  REJECTED: "red",
};

export default function ListingsTable({ listings }: { listings: ListingRow[] }) {
  const [rows, setRows] = useState(listings);
  const [isPending, startTransition] = useTransition();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function run(id: string, action: (id: string) => Promise<{ success: boolean; error?: { message: string } }>, nextStatus: string) {
    setError(null);
    setPendingId(id);
    startTransition(async () => {
      const result = await action(id);
      if (!result.success) {
        setError(result.error?.message ?? "Something went wrong");
      } else {
        setRows((prev) =>
          prev.map((row) => (row.id === id ? { ...row, status: nextStatus } : row)),
        );
      }
      setPendingId(null);
    });
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-neutral-200 dark:border-neutral-700 p-12 text-center">
        <p className="text-neutral-500 dark:text-neutral-400">
          You haven&apos;t created any listings yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 text-sm px-4 py-3">{error}</div>
      )}
      <div className="divide-y divide-neutral-200 dark:divide-neutral-700 rounded-2xl border border-neutral-200 dark:border-neutral-700 overflow-hidden">
        {rows.map((listing) => (
          <div
            key={listing.id}
            className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 sm:p-5"
          >
            <div className="w-full sm:w-28 h-20 flex-shrink-0 rounded-lg bg-neutral-100 dark:bg-neutral-800 overflow-hidden relative">
              {listing.coverImageUrl ? (
                <Image
                  src={listing.coverImageUrl}
                  alt={listing.title}
                  fill
                  className="object-cover"
                  sizes="(min-width: 640px) 112px, 100vw"
                />
              ) : null}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-medium truncate">{listing.title}</h3>
                <Badge name={listing.status.replace("_", " ")} color={STATUS_COLOR[listing.status] ?? "gray"} />
              </div>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                {listing.rentalType === "SHORT_TERM" ? "Short-term" : "Long-term"} · {listing.price}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <ButtonSecondary
                href={`/listing-stay-detail/${listing.slug}` as Route}
                sizeClass="px-4 py-2"
                fontSize="text-sm"
              >
                View
              </ButtonSecondary>
              <ButtonSecondary
                href={`/add-listing/${listing.id}` as Route}
                sizeClass="px-4 py-2"
                fontSize="text-sm"
              >
                Edit
              </ButtonSecondary>
              {listing.status !== "PUBLISHED" && listing.status !== "ARCHIVED" && (
                <button
                  disabled={isPending && pendingId === listing.id}
                  onClick={() => run(listing.id, publishListing, "PUBLISHED")}
                  className="px-4 py-2 text-sm font-medium rounded-full bg-primary-6000 text-white hover:bg-primary-700 disabled:opacity-50"
                >
                  Publish
                </button>
              )}
              {listing.status === "PUBLISHED" && (
                <button
                  disabled={isPending && pendingId === listing.id}
                  onClick={() => run(listing.id, unpublishListing, "PAUSED")}
                  className="px-4 py-2 text-sm font-medium rounded-full border border-neutral-300 dark:border-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-50"
                >
                  Unpublish
                </button>
              )}
              {listing.status !== "ARCHIVED" && (
                <button
                  disabled={isPending && pendingId === listing.id}
                  onClick={() => {
                    if (confirm("Archive this listing? It will no longer be visible to guests.")) {
                      run(listing.id, archiveListing, "ARCHIVED");
                    }
                  }}
                  className="px-4 py-2 text-sm font-medium rounded-full text-red-600 hover:bg-red-50 dark:hover:bg-red-950 disabled:opacity-50"
                >
                  Archive
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
