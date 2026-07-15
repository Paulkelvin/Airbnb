import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getBookingById } from "@/modules/bookings/queries";
import { getConversationIdForBooking } from "@/modules/messaging/queries";
import BookingDetailActions from "./BookingDetailActions";
import BookingMessageEntry from "./BookingMessageEntry";
import type { Route } from "@/routers/types";

export const metadata = {
  title: "Booking Details",
};

function fmt(iso: Date | null) {
  if (!iso) return null;
  return iso.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export default async function BookingDetailPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const booking = await getBookingById(params.id);
  if (!booking) {
    notFound();
  }

  const isGuest = booking.guestId === user.id;
  const isHost = booking.hostId === user.id;
  const isAdmin = user.roles.includes("ADMIN");
  if (!isGuest && !isHost && !isAdmin) {
    notFound();
  }

  const viewerRole: "guest" | "host" = isGuest ? "guest" : "host";
  const counterparty = isGuest ? booking.host : booking.guest;
  const conversationId = await getConversationIdForBooking(booking.id);

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <Link href={"/account-bookings" as Route} className="text-sm text-neutral-500 hover:underline">
          &larr; Back to bookings
        </Link>
        <h2 className="text-3xl font-semibold mt-2">{booking.listing.title}</h2>
        <Link
          href={`/listing-stay-detail/${booking.listing.slug}` as Route}
          className="text-sm text-primary-6000 hover:underline"
        >
          View listing
        </Link>
      </div>

      <div className="rounded-2xl border border-neutral-200 dark:border-neutral-700 p-6 space-y-4">
        <Row label="Status" value={booking.status.replace(/_/g, " ")} />
        {booking.rentalType === "SHORT_TERM" ? (
          <>
            <Row label="Check in" value={fmt(booking.checkInDate) ?? "—"} />
            <Row label="Check out" value={fmt(booking.checkOutDate) ?? "—"} />
            <Row label="Guests" value={String(booking.guestCount ?? "—")} />
            <Row label="Nights" value={String(booking.nights ?? "—")} />
          </>
        ) : (
          <>
            <Row label="Lease start" value={fmt(booking.leaseStartDate) ?? "—"} />
            <Row label="Lease end" value={fmt(booking.leaseEndDate) ?? "—"} />
            <Row label="Lease term" value={`${booking.leaseTermMonths ?? "—"} months`} />
          </>
        )}
        <Row label={viewerRole === "guest" ? "Host" : "Guest"} value={`${counterparty.firstName} ${counterparty.lastName}`} />
        <BookingMessageEntry
          bookingId={booking.id}
          existingConversationId={conversationId}
          counterpartyName={counterparty.firstName}
        />
      </div>

      <div className="rounded-2xl border border-neutral-200 dark:border-neutral-700 p-6 space-y-3">
        <h3 className="font-medium text-lg">Price breakdown</h3>
        {booking.rentalType === "SHORT_TERM" ? (
          <>
            <Row label="Nightly rate" value={`$${Number(booking.nightlyRateSnapshot ?? 0).toFixed(2)}`} />
            {booking.cleaningFeeSnapshot && (
              <Row label="Cleaning fee" value={`$${Number(booking.cleaningFeeSnapshot).toFixed(2)}`} />
            )}
            <Row label="Subtotal" value={`$${Number(booking.subtotal ?? 0).toFixed(2)}`} />
            <Row label="Service fee" value={`$${Number(booking.serviceFee ?? 0).toFixed(2)}`} />
            <Row label="Total" value={`$${Number(booking.totalPrice ?? 0).toFixed(2)}`} bold />
          </>
        ) : (
          <>
            <Row label="Monthly rent" value={`$${Number(booking.monthlyRentSnapshot ?? 0).toFixed(2)}`} />
            {booking.securityDepositSnapshot !== null && (
              <Row
                label="Security deposit"
                value={`$${Number(booking.securityDepositSnapshot).toFixed(2)}${booking.securityDepositPaid ? " (paid)" : ""}`}
              />
            )}
          </>
        )}
      </div>

      {booking.payments.length > 0 && (
        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-700 p-6 space-y-3">
          <h3 className="font-medium text-lg">Payments</h3>
          {booking.payments.map((p) => (
            <Row
              key={p.id}
              label={`${p.type.replace(/_/g, " ")} — ${p.status}`}
              value={`$${(p.amount / 100).toFixed(2)}`}
            />
          ))}
        </div>
      )}

      {booking.cancellationReason && (
        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-700 p-6">
          <Row label="Reason" value={booking.cancellationReason} />
        </div>
      )}

      <BookingDetailActions
        bookingId={booking.id}
        status={booking.status}
        rentalType={booking.rentalType}
        viewerRole={viewerRole}
      />
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? "font-semibold" : ""}`}>
      <span className="text-neutral-500 dark:text-neutral-400">{label}</span>
      <span>{value}</span>
    </div>
  );
}
