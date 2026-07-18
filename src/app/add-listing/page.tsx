import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getActivePropertyTypes } from "@/modules/listings/queries";
import StartListingForm from "./StartListingForm";

export const metadata = { title: "Start a new listing" };

export default async function AddListingStartPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  // Marketplace mode is off: only ADMIN may create listings. Re-enabling
  // public hosting is just removing this check.
  if (!user.roles.includes("ADMIN")) {
    redirect("/account");
  }

  const propertyTypes = await getActivePropertyTypes();

  return (
    <div className="px-4 max-w-2xl mx-auto pb-24 pt-14 sm:py-24">
      <div className="space-y-11">
        <div>
          <h2 className="text-2xl font-semibold">Create your listing</h2>
          <span className="block mt-2 text-neutral-500 dark:text-neutral-400">
            A few basics to get your draft started — you can fill in everything
            else over the next few steps, and your progress is saved as you go.
          </span>
        </div>
        <div className="w-14 border-b border-neutral-200 dark:border-neutral-700" />
        <StartListingForm propertyTypes={propertyTypes} />
      </div>
    </div>
  );
}
