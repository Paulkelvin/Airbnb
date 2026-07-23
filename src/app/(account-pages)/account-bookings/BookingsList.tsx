"use client";

import { useState, useCallback, useTransition } from "react";
import Image from "next/image";
import { cloudinaryLoader } from "@/lib/cloudinary-image-loader";
import Link from "next/link";
import Badge from "@/components/ui/Badge";
import ButtonSecondary from "@/components/ui/ButtonSecondary";
import ConfirmModal from "@/components/ui/ConfirmModal";
import {
  confirmBooking,
  declineBooking,
  cancelBooking,
  terminateLease,
} from "@/modules/bookings/actions";
import type { TwMainColor } from "@/data/types";
import type { Route } from "@/routers/types";
import type { ActionResult } from "@/lib/validations/auth";

export interface BookingRow {
  id: string;
  listingTitle: string;
  listingSlug: string;
  listingImageUrl: string | null;
  rentalType: "SHORT_TERM" | "LONG_TERM";
  status: string;
  currency: string;
  checkInDate: string | null;
  checkOutDate: string | null;
  leaseStartDate: string | null;
  leaseEndDate: string | null;
  totalPrice: number | null;
  monthlyRentSnapshot: number | null;
  counterpartyName: string;
}

const STATUS_COLOR: Record<string, TwMainColor> = {
  PENDING: "yellow",
  CONFIRMED: "blue",
  CHECKED_IN: "blue",
  ACTIVE: "blue",
  COMPLETED: "green",
  TERMINATED_EARLY: "gray",
  CANCELLED_BY_GUEST: "red",
  CANCELLED_BY_HOST: "red",
  DECLINED: "red",
  DISPUTED: "red",
};

function formatDate(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function BookingsList({
  bookings,
  viewerRole,
  emptyMessage,
}: {
  bookings: BookingRow[];
  viewerRole: "guest" | "host";
  emptyMessage: string;
}) {
  const [rows, setRows] = useState(bookings);
  const [isPending, startTransition] = useTransition();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmState, setConfirmState] = useState<{
    open: boolean;
    action: (() => void) | null;
    title: string;
    message: string;
  }>({ open: false, action: null, title: "", message: "" });

  const openConfirm = useCallback(
    (title: string, message: string, action: () => void) =>
      setConfirmState({ open: true, action, title, message }),
    [],
  );
  const closeConfirm = useCallback(
    () => setConfirmState({ open: false, action: null, title: "", message: "" }),
    [],
  );

  function run(
    id: string,
    action: (input: { bookingId: string }) => Promise<ActionResult<{ id: string }>>,
    nextStatus: string,
  ) {
    setError(null);
    setPendingId(id);
    startTransition(async () => {
      const result = await action({ bookingId: id });
      if (!result.success) {
        setError(result.error.message);
      } else {
        setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status: nextStatus } : r)));
      }
      setPendingId(null);
    });
  }

  function runTerminate(id: string) {
    setError(null);
    setPendingId(id);
    startTransition(async () => {
      const result = await terminateLease({ bookingId: id, terminationDate: new Date() });
      if (!result.success) {
        setError(result.error.message);
      } else {
        setRows((prev) =>
          prev.map((r) => (r.id === id ? { ...r, status: "TERMINATED_EARLY" } : r)),
        );
      }
      setPendingId(null);
    });
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-neutral-200 dark:border-neutral-700 p-12 text-center">
        <p className="text-neutral-500 dark:text-neutral-400">{emptyMessage}</p>
        <Link
          href={"/listing-stay-detail/potomac-vista-cottage" as Route}
          className="mt-4 inline-block rounded-full border border-neutral-300 dark:border-neutral-600 px-5 py-2 text-sm font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
        >
          View the cottage
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && <div className="rounded-lg bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 text-sm px-4 py-3">{error}</div>}
      <ConfirmModal
        open={confirmState.open}
        onClose={closeConfirm}
        onConfirm={() => confirmState.action?.()}
        title={confirmState.title}
        message={confirmState.message}
        variant="danger"
        confirmLabel="Yes, continue"
      />
      <div className="divide-y divide-neutral-200 dark:divide-neutral-700 rounded-2xl border border-neutral-200 dark:border-neutral-700 overflow-hidden">
        {rows.map((b) => {
          const isRowPending = isPending && pendingId === b.id;
          const dateLabel =
            b.rentalType === "SHORT_TERM"
              ? `${formatDate(b.checkInDate)} — ${formatDate(b.checkOutDate)}`
              : `${formatDate(b.leaseStartDate)} — ${formatDate(b.leaseEndDate)}`;
          const priceLabel =
            b.rentalType === "SHORT_TERM"
              ? b.totalPrice !== null
                ? `$${b.totalPrice.toFixed(2)} total`
                : ""
              : b.monthlyRentSnapshot !== null
                ? `$${b.monthlyRentSnapshot.toFixed(2)}/month`
                : "";

          return (
            <div key={b.id} className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 sm:p-5">
              <div className="w-full sm:w-28 h-20 flex-shrink-0 rounded-lg bg-neutral-100 dark:bg-neutral-800 overflow-hidden relative">
                {b.listingImageUrl ? (
                  <Image src={b.listingImageUrl} loader={cloudinaryLoader} alt={b.listingTitle} fill className="object-cover" sizes="(min-width: 640px) 112px, 100vw" />
                ) : null}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium truncate">{b.listingTitle}</h3>
                  <Badge name={b.status.replace(/_/g, " ")} color={STATUS_COLOR[b.status] ?? "gray"} />
                </div>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                  {dateLabel} {priceLabel && `· ${priceLabel}`}
                </p>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  {viewerRole === "guest" ? "Host" : "Guest"}: {b.counterpartyName}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <ButtonSecondary
                  href={`/account-bookings/${b.id}` as Route}
                  sizeClass="px-4 py-2"
                  fontSize="text-sm"
                >
                  View
                </ButtonSecondary>

                {viewerRole === "host" && b.status === "PENDING" && (
                  <>
                    <button
                      disabled={isRowPending}
                      onClick={() => run(b.id, confirmBooking, "CONFIRMED")}
                      className="px-4 py-2 text-sm font-medium rounded-full bg-primary-6000 text-white hover:bg-primary-700 disabled:opacity-50"
                    >
                      Confirm
                    </button>
                    <button
                      disabled={isRowPending}
                      onClick={() => run(b.id, declineBooking, "DECLINED")}
                      className="px-4 py-2 text-sm font-medium rounded-full text-red-600 hover:bg-red-50 dark:hover:bg-red-950 disabled:opacity-50"
                    >
                      Decline
                    </button>
                  </>
                )}

                {viewerRole === "guest" && (b.status === "PENDING" || b.status === "CONFIRMED") && (
                  <button
                    disabled={isRowPending}
                    onClick={() =>
                      openConfirm(
                        "Cancel booking",
                        "Are you sure you want to cancel this booking?",
                        () => run(b.id, cancelBooking, "CANCELLED_BY_GUEST"),
                      )
                    }
                    className="px-4 py-2 text-sm font-medium rounded-full text-red-600 hover:bg-red-50 dark:hover:bg-red-950 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                )}

                {viewerRole === "host" && b.status === "CONFIRMED" && (
                  <button
                    disabled={isRowPending}
                    onClick={() =>
                      openConfirm(
                        "Cancel booking",
                        "Are you sure you want to cancel this booking?",
                        () => run(b.id, cancelBooking, "CANCELLED_BY_HOST"),
                      )
                    }
                    className="px-4 py-2 text-sm font-medium rounded-full text-red-600 hover:bg-red-50 dark:hover:bg-red-950 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                )}

                {b.rentalType === "LONG_TERM" && b.status === "ACTIVE" && (
                  <button
                    disabled={isRowPending}
                    onClick={() =>
                      openConfirm(
                        "Terminate lease",
                        "Are you sure you want to end this lease early?",
                        () => runTerminate(b.id),
                      )
                    }
                    className="px-4 py-2 text-sm font-medium rounded-full text-red-600 hover:bg-red-50 dark:hover:bg-red-950 disabled:opacity-50"
                  >
                    Terminate lease
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
