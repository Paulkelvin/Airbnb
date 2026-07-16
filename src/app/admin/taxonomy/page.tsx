import { getPropertyTypes, getAmenities } from "@/modules/admin/queries";
import { TaxonomyManager } from "./TaxonomyManager";

export const metadata = { title: "Taxonomy Management" };

export default async function AdminTaxonomyPage() {
  const [propertyTypes, amenities] = await Promise.all([
    getPropertyTypes(),
    getAmenities(),
  ]);

  return (
    <div>
      <h2 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100 mb-6">
        Taxonomy Management
      </h2>
      <TaxonomyManager
        propertyTypes={JSON.parse(JSON.stringify(propertyTypes))}
        amenities={JSON.parse(JSON.stringify(amenities))}
      />
    </div>
  );
}
