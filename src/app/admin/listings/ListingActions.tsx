"use client";

import React, { useTransition } from "react";
import { useRouter } from "next/navigation";
import { approveListing, rejectListing, adminUnpublishListing } from "@/modules/admin/actions";

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

  return (
    <div className="flex gap-1 flex-wrap">
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
            onClick={() => handleAction(() => rejectListing(listingId))}
            disabled={isPending}
            className="px-2 py-1 text-xs rounded bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40 disabled:opacity-50"
          >
            Reject
          </button>
        </>
      )}
      {status === "PUBLISHED" && (
        <button
          onClick={() => handleAction(() => adminUnpublishListing(listingId))}
          disabled={isPending}
          className="px-2 py-1 text-xs rounded bg-yellow-50 text-yellow-600 hover:bg-yellow-100 dark:bg-yellow-900/20 dark:text-yellow-400 dark:hover:bg-yellow-900/40 disabled:opacity-50"
        >
          Unpublish
        </button>
      )}
    </div>
  );
}
