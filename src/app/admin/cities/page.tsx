import { getCities } from "@/modules/admin/queries";
import { CitiesManager } from "./CitiesManager";
import { AdminPageHeader } from "../AdminUI";

export const metadata = { title: "Cities" };

export default async function AdminCitiesPage() {
  const { cities, total } = await getCities();

  return (
    <div>
      <AdminPageHeader
        title="Cities"
        description={`${total.toLocaleString()} US Census places available. Only active cities here can appear in the homepage's Top Cities curation.`}
      />
      <CitiesManager initialCities={JSON.parse(JSON.stringify(cities))} initialTotal={total} />
    </div>
  );
}
