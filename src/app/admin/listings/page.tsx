import { getAdminListings } from "@/modules/admin/queries";
import { ListingActions } from "./ListingActions";
import Link from "next/link";
import Image from "next/image";
import { cloudinaryLoader } from "@/lib/cloudinary-image-loader";
import {
  AdminPageHeader,
  AdminFilterPills,
  AdminTableCard,
  AdminBadge,
  AdminPagination,
  listingStatusTone,
} from "../AdminUI";

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
      <AdminPageHeader title="Listing Management" description={`${total} total listings`} />

      <AdminFilterPills
        options={STATUSES}
        activeValue={searchParams.status ?? "ALL"}
        basePath="/admin/listings"
        formatLabel={(s) => s.replace("_", " ")}
      />

      <AdminTableCard>
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
                      <Image
                        src={listing.images[0].url}
                        loader={cloudinaryLoader}
                        alt=""
                        width={40}
                        height={40}
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
                  <AdminBadge tone={listingStatusTone(listing.status)}>
                    {listing.status.replace("_", " ")}
                  </AdminBadge>
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
      </AdminTableCard>

      <AdminPagination
        page={page}
        totalPages={totalPages}
        basePath="/admin/listings"
        extraParams={searchParams.status ? `&status=${searchParams.status}` : ""}
      />
    </div>
  );
}
