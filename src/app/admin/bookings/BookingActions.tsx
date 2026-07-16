"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { adminResolveDispute } from "@/modules/bookings/actions";

const RESOLUTION_OPTIONS = [
  { label: "Refund guest & cancel", resolution: "REFUND_GUEST" as const },
  { label: "Deny refund, side with host", resolution: "SIDE_WITH_HOST" as const },
];

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

  function handleResolve(resolution: "REFUND_GUEST" | "SIDE_WITH_HOST") {
    const reason = window.prompt(
      resolution === "REFUND_GUEST"
        ? "Reason for refunding the guest and cancelling this booking:"
        : "Reason for denying the refund and closing this dispute:",
    );
    if (reason === null) return;
    startTransition(async () => {
      await adminResolveDispute(bookingId, resolution, reason.trim() || "Admin dispute resolution");
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
              key={opt.resolution}
              onClick={() => handleResolve(opt.resolution)}
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
