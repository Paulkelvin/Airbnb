import { redirect } from "next/navigation";
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
        <h2 className="text-3xl font-semibold">Saved listings</h2>
      </div>
      <div className="w-14 border-b border-neutral-200 dark:border-neutral-700"></div>

      {items.length === 0 ? (
        <p className="text-neutral-500">You haven&apos;t saved any listings yet.</p>
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
