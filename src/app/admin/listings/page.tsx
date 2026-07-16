import { getAdminListings } from "@/modules/admin/queries";
import { ListingActions } from "./ListingActions";
import Link from "next/link";

export const metadata = { title: "Listing Management" };

const STATUSES = ["ALL", "PENDING_REVIEW", "PUBLISHED", "DRAFT", "PAUSED", "REJECTED", "ARCHIVED"] as const;

export default async function AdminListingsPage({
  searchParams,
}: {
  searchParams: { page?: string; status?: string };
}) {
  const page = Number(searchParams.page) || 1;
  const { listings, total, totalPages } = await getAdminListings({
    page,
    status: searchParams.status && searchParams.status !== "ALL" ? (searchParams.status as never) : undefined,
  });

  return (
    <div>
      <h2 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100 mb-6">
        Listing Management
      </h2>

      <div className="flex gap-2 mb-4 flex-wrap">
        {STATUSES.map((s) => {
          const isActive = (searchParams.status ?? "ALL") === s;
          const href = s === "ALL" ? "/admin/listings" : `/admin/listings?status=${s}`;
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
              {s.replace("_", " ")}
            </Link>
          );
        })}
      </div>

      <div className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 dark:border-neutral-700 text-left">
              <th className="px-4 py-3 font-medium text-neutral-500 dark:text-neutral-400">Listing</th>
              <th className="px-4 py-3 font-medium text-neutral-500 dark:text-neutral-400">Host</th>
              <th className="px-4 py-3 font-medium text-neutral-500 dark:text-neutral-400">Type</th>
              <th className="px-4 py-3 font-medium text-neutral-500 dark:text-neutral-400">Status</th>
              <th className="px-4 py-3 font-medium text-neutral-500 dark:text-neutral-400">Created</th>
              <th className="px-4 py-3 font-medium text-neutral-500 dark:text-neutral-400">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700">
            {listings.map((listing) => (
              <tr key={listing.id}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {listing.images[0] && (
                      <img
                        src={listing.images[0].url}
                        alt=""
                        className="w-10 h-10 rounded object-cover"
                      />
                    )}
                    <div>
                      <Link
                        href={`/listing-stay-detail/${listing.slug}` as never}
                        className="font-medium text-neutral-900 dark:text-neutral-100 hover:text-primary-6000"
                      >
                        {listing.title}
                      </Link>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-neutral-600 dark:text-neutral-300">
                  {listing.host.firstName} {listing.host.lastName}
                  <div className="text-xs text-neutral-400">{listing.host.email}</div>
                </td>
                <td className="px-4 py-3 text-neutral-600 dark:text-neutral-300">
                  {listing.rentalType.replace("_", " ")}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`px-2 py-0.5 text-xs rounded-full ${
                      listing.status === "PUBLISHED"
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : listing.status === "PENDING_REVIEW"
                          ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                          : listing.status === "REJECTED"
                            ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                            : "bg-neutral-100 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300"
                    }`}
                  >
                    {listing.status.replace("_", " ")}
                  </span>
                </td>
                <td className="px-4 py-3 text-neutral-500 dark:text-neutral-400 text-xs">
                  {new Date(listing.createdAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-3">
                  <ListingActions
                    listingId={listing.id}
                    status={listing.status}
                  />
                </td>
              </tr>
            ))}
            {listings.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-neutral-500 dark:text-neutral-400">
                  No listings found
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
              href={`/admin/listings?page=${p}${searchParams.status ? `&status=${searchParams.status}` : ""}` as never}
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

      <p className="mt-2 text-xs text-neutral-400 text-center">{total} total listings</p>
    </div>
  );
}
