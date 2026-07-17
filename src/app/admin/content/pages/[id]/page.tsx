import { notFound } from "next/navigation";
import { AdminPageHeader } from "../../../AdminUI";
import { getAdminPage } from "@/modules/cms/queries";
import PageForm from "../PageForm";

export const metadata = { title: "Edit Page" };

export default async function EditPagePage({ params }: { params: { id: string } }) {
  const page = await getAdminPage(params.id);
  if (!page) notFound();

  return (
    <div>
      <AdminPageHeader title={`Edit: ${page.title}`} />
      <PageForm page={page} />
    </div>
  );
}
