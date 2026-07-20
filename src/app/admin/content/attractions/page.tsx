import { AdminPageHeader } from "../../AdminUI";
import { getAdminAttractions } from "@/modules/cms/queries";
import AttractionsManager from "./AttractionsManager";

export const metadata = { title: "Explore the Area" };

export default async function AdminAttractionsPage() {
  const attractions = await getAdminAttractions();
  return (
    <div>
      <AdminPageHeader
        title="Explore the Area"
        description={`${attractions.length} nearby attraction${attractions.length === 1 ? "" : "s"} shown to guests`}
      />
      <AttractionsManager attractions={attractions} />
    </div>
  );
}
