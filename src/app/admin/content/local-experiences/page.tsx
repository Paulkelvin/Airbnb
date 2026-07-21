import { AdminPageHeader } from "../../AdminUI";
import { getAdminLocalExperiences } from "@/modules/cms/queries";
import LocalExperiencesManager from "./LocalExperiencesManager";

export const metadata = { title: "Explore the Area" };

export default async function AdminLocalExperiencesPage() {
  const experiences = await getAdminLocalExperiences();
  return (
    <div>
      <AdminPageHeader
        title="Explore the Area"
        description={`${experiences.length} local experience${experiences.length === 1 ? "" : "s"} shown to guests`}
      />
      <LocalExperiencesManager experiences={experiences} />
    </div>
  );
}
