import SectionGridFilterCard from "../SectionGridFilterCard";
import { searchListings } from "@/modules/listings/search";
import { parseSearchParams } from "@/lib/validations/search";
import { getActivePropertyTypes, getActiveAmenities } from "@/modules/listings/queries";

export const dynamic = "force-dynamic";

export default async function ListingStayPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const params = parseSearchParams(searchParams);
  const [{ items, nextCursor, appliedSort }, propertyTypes, amenities] = await Promise.all([
    searchListings(params),
    getActivePropertyTypes(),
    getActiveAmenities(),
  ]);

  // Remount the results grid (resetting any "load more" state) whenever the
  // filter set changes, but not on cursor-only changes.
  const { cursor: _cursor, ...filterParams } = searchParams as Record<string, string>;
  const resultKey = JSON.stringify(filterParams);

  return (
    <SectionGridFilterCard
      className="container pb-24 lg:pb-28"
      items={items}
      nextCursor={nextCursor}
      propertyTypes={propertyTypes}
      amenities={amenities}
      appliedSort={appliedSort}
      resultKey={resultKey}
    />
  );
}
