import SectionGridFilterCard from "../SectionGridFilterCard";
import { getPublishedListings } from "@/modules/listings/queries";
import { toCardViewModel } from "@/modules/listings/types";

export const dynamic = "force-dynamic";

export default async function ListingStayPage() {
  const { items } = await getPublishedListings({ limit: 24 });
  const data = items.map(toCardViewModel);

  return <SectionGridFilterCard className="container pb-24 lg:pb-28" data={data} />;
}
