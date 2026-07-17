"use client";

import { useState, useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import ButtonPrimary from "@/components/ui/ButtonPrimary";
import ButtonSecondary from "@/components/ui/ButtonSecondary";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { confirmBooking, declineBooking, cancelBooking, terminateLease } from "@/modules/bookings/actions";

export default function BookingDetailActions({
  bookingId,
  status,
  rentalType,
  viewerRole,
}: {
  bookingId: string;
  status: string;
  rentalType: "SHORT_TERM" | "LONG_TERM";
  viewerRole: "guest" | "host";
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
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

  function run(action: () => Promise<{ success: boolean; error?: { message: string } }>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.success) {
        setError(result.error?.message ?? "Something went wrong");
        return;
      }
      router.refresh();
    });
  }

  const canConfirmOrDecline = viewerRole === "host" && status === "PENDING";
  const canCancelAsGuest = viewerRole === "guest" && (status === "PENDING" || status === "CONFIRMED");
  const canCancelAsHost = viewerRole === "host" && status === "CONFIRMED";
  const canTerminate = rentalType === "LONG_TERM" && status === "ACTIVE";

  if (!canConfirmOrDecline && !canCancelAsGuest && !canCancelAsHost && !canTerminate) {
    return null;
  }

  return (
    <div className="space-y-3">
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex flex-wrap gap-3">
        {canConfirmOrDecline && (
          <>
            <ButtonPrimary
              disabled={isPending}
              loading={isPending}
              onClick={() => run(() => confirmBooking({ bookingId }))}
            >
              Confirm booking
            </ButtonPrimary>
            <ButtonSecondary
              disabled={isPending}
              onClick={() => run(() => declineBooking({ bookingId }))}
            >
              Decline
            </ButtonSecondary>
          </>
        )}
        {(canCancelAsGuest || canCancelAsHost) && (
          <ButtonSecondary
            disabled={isPending}
            onClick={() =>
              openConfirm(
                "Cancel booking",
                "Are you sure you want to cancel this booking?",
                () => run(() => cancelBooking({ bookingId })),
              )
            }
          >
            Cancel booking
          </ButtonSecondary>
        )}
        {canTerminate && (
          <ButtonSecondary
            disabled={isPending}
            onClick={() =>
              openConfirm(
                "Terminate lease",
                "Are you sure you want to end this lease early?",
                () => run(() => terminateLease({ bookingId, terminationDate: new Date() })),
              )
            }
          >
            Terminate lease
          </ButtonSecondary>
        )}
      </div>
    </div>
  );
}
