import SectionGridHasMap from "../SectionGridHasMap";
import { searchListings } from "@/modules/listings/search";
import { parseSearchParams } from "@/lib/validations/search";
import { getActivePropertyTypes, getActiveAmenities } from "@/modules/listings/queries";

export const dynamic = "force-dynamic";

export default async function ListingStayMapPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const params = parseSearchParams(searchParams);
  const [{ items, nextCursor }, propertyTypes, amenities] = await Promise.all([
    searchListings(params),
    getActivePropertyTypes(),
    getActiveAmenities(),
  ]);

  const mapCenter =
    params.lat !== undefined && params.lng !== undefined
      ? { lat: params.lat, lng: params.lng }
      : items[0]?.map ?? { lat: 40.7128, lng: -74.006 };

  const { cursor: _cursor, ...filterParams } = searchParams as Record<string, string>;
  const resultKey = JSON.stringify(filterParams);

  return (
    <div className="container pb-24 lg:pb-28 2xl:pl-10 xl:pr-0 xl:max-w-none">
      <SectionGridHasMap
        key={resultKey}
        items={items}
        nextCursor={nextCursor}
        propertyTypes={propertyTypes}
        amenities={amenities}
        mapCenter={mapCenter}
      />
    </div>
  );
}
