import { redirect } from "next/navigation";
import Link from "next/link";
import StayCard from "@/components/StayCard";
import { getCurrentUser } from "@/lib/auth";
import { getMyFavoriteListings } from "@/modules/favorites/queries";
import { toCardViewModel } from "@/modules/listings/types";

export const metadata = {
  title: "Saved listings",
};

export default async function AccountSavelists() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const favorites = await getMyFavoriteListings(user.id);
  const items = favorites.map(toCardViewModel);

  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <h1 className="text-3xl font-semibold">Saved Stays</h1>
      </div>
      <div className="w-14 border-b border-neutral-200 dark:border-neutral-700"></div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-700 p-12 text-center">
          <p className="text-neutral-500 dark:text-neutral-400">You haven&apos;t saved any listings yet.</p>
          <Link
            href="/listing-stay"
            className="mt-4 inline-block rounded-full border border-neutral-300 dark:border-neutral-600 px-5 py-2 text-sm font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            Explore listings
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((stay) => (
            <StayCard key={stay.id} data={stay} />
          ))}
        </div>
      )}
    </div>
  );
}
