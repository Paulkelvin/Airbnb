import { AdminPageHeader } from "../../AdminUI";
import { getAdminAboutPage } from "@/modules/cms/queries";
import AboutPageForm from "./AboutPageForm";

export const metadata = { title: "About Page" };

export default async function AdminAboutPage() {
  const aboutPage = await getAdminAboutPage();
  return (
    <div>
      <AdminPageHeader
        title="About Page"
        description="Edit the content shown on the public /about page."
      />
      <AboutPageForm aboutPage={aboutPage} />
    </div>
  );
}
