import { getPropertyTypes, getAmenities } from "@/modules/admin/queries";
import { TaxonomyManager } from "./TaxonomyManager";
import { AdminPageHeader } from "../AdminUI";

export const metadata = { title: "Taxonomy Management" };

export default async function AdminTaxonomyPage() {
  const [propertyTypes, amenities] = await Promise.all([
    getPropertyTypes(),
    getAmenities(),
  ]);

  return (
    <div>
      <AdminPageHeader
        title="Taxonomy Management"
        description="Manage the property types and amenities hosts can select when listing a place."
      />
      <TaxonomyManager
        propertyTypes={JSON.parse(JSON.stringify(propertyTypes))}
        amenities={JSON.parse(JSON.stringify(amenities))}
      />
    </div>
  );
}
