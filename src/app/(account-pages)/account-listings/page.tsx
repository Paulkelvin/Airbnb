import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getMyListings } from "@/modules/listings/queries";
import ListingsTable from "./ListingsTable";

export const metadata = {
  title: "My Listings",
};

export default async function AccountListingsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const listings = await getMyListings(user.id);

  const rows = listings.map((listing) => {
    const cover =
      listing.images.find((img) => img.isCover) ??
      [...listing.images].sort((a, b) => a.position - b.position)[0];
    const price =
      listing.rentalType === "SHORT_TERM"
        ? listing.nightlyPrice
          ? `$${Number(listing.nightlyPrice)}/night`
          : "—"
        : listing.monthlyRent
          ? `$${Number(listing.monthlyRent)}/month`
          : "—";

    return {
      id: listing.id,
      slug: listing.slug,
      title: listing.title,
      status: listing.status,
      rentalType: listing.rentalType,
      price,
      coverImageUrl: cover?.url ?? null,
      updatedAt: listing.updatedAt.toISOString(),
    };
  });

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold">Your Listings</h1>
        <a
          href="/add-listing"
          className="inline-flex items-center justify-center rounded-full bg-primary-6000 px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-700 transition-colors"
        >
          + New listing
        </a>
      </div>
      <div className="w-14 border-b border-neutral-200 dark:border-neutral-700" />

      <ListingsTable listings={rows} />
    </div>
  );
}
