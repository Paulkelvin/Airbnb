import { getCities } from "@/modules/admin/queries";
import { CitiesManager } from "./CitiesManager";
import { AdminPageHeader } from "../AdminUI";

export const metadata = { title: "Cities" };

export default async function AdminCitiesPage() {
  const cities = await getCities();

  return (
    <div>
      <AdminPageHeader
        title="Cities"
        description="Manage the cities hosts can pick from when listing a place. Only active cities here can appear in the homepage's Top Cities curation."
      />
      <CitiesManager cities={JSON.parse(JSON.stringify(cities))} />
    </div>
  );
}
