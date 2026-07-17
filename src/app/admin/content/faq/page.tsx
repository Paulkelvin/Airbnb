import { AdminPageHeader } from "../../AdminUI";
import { getAdminFaqs } from "@/modules/cms/queries";
import FaqManager from "./FaqManager";

export const metadata = { title: "FAQ" };

export default async function AdminFaqPage() {
  const faqs = await getAdminFaqs();
  return (
    <div>
      <AdminPageHeader
        title="FAQ"
        description={`${faqs.length} question${faqs.length === 1 ? "" : "s"} on the Help Centre page`}
      />
      <FaqManager faqs={faqs} />
    </div>
  );
}
