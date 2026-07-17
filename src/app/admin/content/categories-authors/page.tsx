import { AdminPageHeader } from "../../AdminUI";
import { getAdminCategories, getAdminAuthors } from "@/modules/cms/queries";
import CategoriesAuthorsManager from "./CategoriesAuthorsManager";

export const metadata = { title: "Categories & Authors" };

export default async function CategoriesAuthorsPage() {
  const [categories, authors] = await Promise.all([getAdminCategories(), getAdminAuthors()]);

  return (
    <div>
      <AdminPageHeader
        title="Categories & Authors"
        description="Blog taxonomy and author profiles used when writing posts."
      />
      <CategoriesAuthorsManager categories={categories} authors={authors} />
    </div>
  );
}
