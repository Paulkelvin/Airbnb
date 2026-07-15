import SectionGridHasMap from "../SectionGridHasMap";
import { getPublishedListings } from "@/modules/listings/queries";
import { toCardViewModel } from "@/modules/listings/types";

export const dynamic = "force-dynamic";

export default async function ListingStayMapPage() {
  const { items } = await getPublishedListings({ limit: 24 });
  const data = items.map(toCardViewModel);

  return (
    <div className="container pb-24 lg:pb-28 2xl:pl-10 xl:pr-0 xl:max-w-none">
      <SectionGridHasMap data={data} />
    </div>
  );
}
