import { AdminPageHeader } from "../../../AdminUI";
import PageForm from "../PageForm";

export const metadata = { title: "New Page" };

export default function NewPagePage() {
  return (
    <div>
      <AdminPageHeader title="New page" />
      <PageForm />
    </div>
  );
}
