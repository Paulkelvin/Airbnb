"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { adminForceBookingTransition } from "@/modules/admin/actions";

const RESOLUTION_OPTIONS = [
  { label: "Mark Completed", status: "COMPLETED" },
  { label: "Cancel (Guest)", status: "CANCELLED_BY_GUEST" },
  { label: "Cancel (Host)", status: "CANCELLED_BY_HOST" },
] as const;

export function BookingActions({
  bookingId,
  status,
}: {
  bookingId: string;
  status: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [showResolve, setShowResolve] = useState(false);
  const router = useRouter();

  function handleResolve(nextStatus: string) {
    startTransition(async () => {
      await adminForceBookingTransition(bookingId, nextStatus as never, "Admin dispute resolution");
      setShowResolve(false);
      router.refresh();
    });
  }

  if (status !== "DISPUTED") return null;

  return (
    <div>
      {!showResolve ? (
        <button
          onClick={() => setShowResolve(true)}
          className="px-2 py-1 text-xs rounded bg-yellow-50 text-yellow-600 hover:bg-yellow-100 dark:bg-yellow-900/20 dark:text-yellow-400 dark:hover:bg-yellow-900/40"
        >
          Resolve
        </button>
      ) : (
        <div className="flex gap-1 flex-wrap">
          {RESOLUTION_OPTIONS.map((opt) => (
            <button
              key={opt.status}
              onClick={() => handleResolve(opt.status)}
              disabled={isPending}
              className="px-2 py-1 text-xs rounded bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-600 disabled:opacity-50"
            >
              {opt.label}
            </button>
          ))}
          <button
            onClick={() => setShowResolve(false)}
            className="px-2 py-1 text-xs rounded text-neutral-400 hover:text-neutral-600"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
