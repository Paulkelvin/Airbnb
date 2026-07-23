import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getMyBookingsAsGuest, getMyBookingsAsHost } from "@/modules/bookings/queries";
import BookingsList, { type BookingRow } from "./BookingsList";

export const metadata = {
  title: "My Bookings",
};

function toRow(booking: Awaited<ReturnType<typeof getMyBookingsAsGuest>>[number]): BookingRow {
  const cover = booking.listing.images[0]?.url ?? null;
  return {
    id: booking.id,
    listingTitle: booking.listing.title,
    listingSlug: booking.listing.slug,
    listingImageUrl: cover,
    rentalType: booking.rentalType,
    status: booking.status,
    currency: booking.currency,
    checkInDate: booking.checkInDate ? booking.checkInDate.toISOString() : null,
    checkOutDate: booking.checkOutDate ? booking.checkOutDate.toISOString() : null,
    leaseStartDate: booking.leaseStartDate ? booking.leaseStartDate.toISOString() : null,
    leaseEndDate: booking.leaseEndDate ? booking.leaseEndDate.toISOString() : null,
    totalPrice: booking.totalPrice ? Number(booking.totalPrice) : null,
    monthlyRentSnapshot: booking.monthlyRentSnapshot ? Number(booking.monthlyRentSnapshot) : null,
    counterpartyName: [booking.host.firstName, booking.host.lastName].filter(Boolean).join(" "),
  };
}

export default async function AccountBookingsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const [guestBookings, hostBookings] = await Promise.all([
    getMyBookingsAsGuest(user.id),
    getMyBookingsAsHost(user.id),
  ]);

  const guestRows = guestBookings.map(toRow);
  const hostRows = hostBookings.map((booking) => ({
    ...toRow(booking),
    counterpartyName: [booking.guest.firstName, booking.guest.lastName].filter(Boolean).join(" "),
  }));

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-semibold">Your Trips</h1>
        <div className="w-14 border-b border-neutral-200 dark:border-neutral-700 my-4" />
        <BookingsList bookings={guestRows} viewerRole="guest" emptyMessage="You haven't booked anything yet." />
      </div>

      {hostRows.length > 0 && (
        <div>
          <h2 className="text-3xl font-semibold">Booking Requests</h2>
          <div className="w-14 border-b border-neutral-200 dark:border-neutral-700 my-4" />
          <BookingsList bookings={hostRows} viewerRole="host" emptyMessage="No booking requests yet." />
        </div>
      )}
    </div>
  );
}
