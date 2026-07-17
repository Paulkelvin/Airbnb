import { getAdminBookings } from "@/modules/admin/queries";
import { BookingActions } from "./BookingActions";
import {
  AdminPageHeader,
  AdminFilterPills,
  AdminTableCard,
  AdminBadge,
  AdminPagination,
  bookingStatusTone,
} from "../AdminUI";

export const metadata = { title: "Booking Oversight" };

const STATUSES = ["ALL", "DISPUTED", "PENDING", "CONFIRMED", "ACTIVE", "COMPLETED", "CANCELLED_BY_GUEST", "CANCELLED_BY_HOST"] as const;

export default async function AdminBookingsPage({
  searchParams,
}: {
  searchParams: { page?: string; status?: string };
}) {
  const page = Number(searchParams.page) || 1;
  const { bookings, total, totalPages } = await getAdminBookings({
    page,
    status: searchParams.status && searchParams.status !== "ALL" ? (searchParams.status as never) : undefined,
  });

  return (
    <div>
      <AdminPageHeader title="Booking Oversight" description={`${total} total bookings`} />

      <AdminFilterPills
        options={STATUSES}
        activeValue={searchParams.status ?? "ALL"}
        basePath="/admin/bookings"
        formatLabel={(s) => s.replace(/_/g, " ")}
      />

      <AdminTableCard>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 dark:border-neutral-700 text-left">
              <th className="px-4 py-3 font-medium text-neutral-500 dark:text-neutral-400">Booking</th>
              <th className="px-4 py-3 font-medium text-neutral-500 dark:text-neutral-400">Guest</th>
              <th className="px-4 py-3 font-medium text-neutral-500 dark:text-neutral-400">Status</th>
              <th className="px-4 py-3 font-medium text-neutral-500 dark:text-neutral-400">Type</th>
              <th className="px-4 py-3 font-medium text-neutral-500 dark:text-neutral-400">Total</th>
              <th className="px-4 py-3 font-medium text-neutral-500 dark:text-neutral-400">Dates</th>
              <th className="px-4 py-3 font-medium text-neutral-500 dark:text-neutral-400">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700">
            {bookings.map((booking) => (
              <tr key={booking.id}>
                <td className="px-4 py-3">
                  <div className="font-medium text-neutral-900 dark:text-neutral-100 text-xs font-mono">
                    {booking.id.slice(0, 8)}...
                  </div>
                  <div className="text-xs text-neutral-400">{booking.listing.title}</div>
                </td>
                <td className="px-4 py-3 text-neutral-600 dark:text-neutral-300">
                  {booking.guest.firstName} {booking.guest.lastName}
                  <div className="text-xs text-neutral-400">{booking.guest.email}</div>
                </td>
                <td className="px-4 py-3">
                  <AdminBadge tone={bookingStatusTone(booking.status)}>
                    {booking.status.replace(/_/g, " ")}
                  </AdminBadge>
                </td>
                <td className="px-4 py-3 text-neutral-600 dark:text-neutral-300 text-xs">
                  {booking.rentalType.replace("_", " ")}
                </td>
                <td className="px-4 py-3 text-neutral-600 dark:text-neutral-300">
                  ${Number(booking.totalPrice).toFixed(2)}
                </td>
                <td className="px-4 py-3 text-neutral-500 dark:text-neutral-400 text-xs">
                  {booking.checkInDate ? new Date(booking.checkInDate).toLocaleDateString() : "—"}
                  {" – "}
                  {booking.checkOutDate ? new Date(booking.checkOutDate).toLocaleDateString() : "—"}
                </td>
                <td className="px-4 py-3">
                  <BookingActions
                    bookingId={booking.id}
                    status={booking.status}
                  />
                </td>
              </tr>
            ))}
            {bookings.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-neutral-500 dark:text-neutral-400">
                  No bookings found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </AdminTableCard>

      <AdminPagination
        page={page}
        totalPages={totalPages}
        basePath="/admin/bookings"
        extraParams={searchParams.status ? `&status=${searchParams.status}` : ""}
      />
    </div>
  );
}
