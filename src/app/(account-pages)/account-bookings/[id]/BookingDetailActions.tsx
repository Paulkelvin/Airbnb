"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import ButtonPrimary from "@/components/ui/ButtonPrimary";
import ButtonSecondary from "@/components/ui/ButtonSecondary";
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
            onClick={() => {
              if (confirm("Cancel this booking?")) {
                run(() => cancelBooking({ bookingId }));
              }
            }}
          >
            Cancel booking
          </ButtonSecondary>
        )}
        {canTerminate && (
          <ButtonSecondary
            disabled={isPending}
            onClick={() => {
              if (confirm("End this lease early?")) {
                run(() => terminateLease({ bookingId, terminationDate: new Date() }));
              }
            }}
          >
            Terminate lease
          </ButtonSecondary>
        )}
      </div>
    </div>
  );
}
