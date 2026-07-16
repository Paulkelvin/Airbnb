import { getAdminBookings } from "@/modules/admin/queries";
import { BookingActions } from "./BookingActions";
import Link from "next/link";

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
      <h2 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100 mb-6">
        Booking Oversight
      </h2>

      <div className="flex gap-2 mb-4 flex-wrap">
        {STATUSES.map((s) => {
          const isActive = (searchParams.status ?? "ALL") === s;
          const href = s === "ALL" ? "/admin/bookings" : `/admin/bookings?status=${s}`;
          return (
            <Link
              key={s}
              href={href as never}
              className={`px-3 py-1.5 text-sm rounded-full border ${
                isActive
                  ? "bg-primary-6000 text-white border-primary-6000"
                  : "border-neutral-300 dark:border-neutral-600 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700"
              }`}
            >
              {s.replace(/_/g, " ")}
            </Link>
          );
        })}
      </div>

      <div className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800">
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
                  <span
                    className={`px-2 py-0.5 text-xs rounded-full ${
                      booking.status === "DISPUTED"
                        ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                        : booking.status === "COMPLETED"
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : booking.status === "CONFIRMED" || booking.status === "ACTIVE"
                            ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                            : "bg-neutral-100 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300"
                    }`}
                  >
                    {booking.status.replace(/_/g, " ")}
                  </span>
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
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={`/admin/bookings?page=${p}${searchParams.status ? `&status=${searchParams.status}` : ""}` as never}
              className={`px-3 py-1 text-sm rounded ${
                p === page
                  ? "bg-primary-6000 text-white"
                  : "bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300"
              }`}
            >
              {p}
            </Link>
          ))}
        </div>
      )}

      <p className="mt-2 text-xs text-neutral-400 text-center">{total} total bookings</p>
    </div>
  );
}
