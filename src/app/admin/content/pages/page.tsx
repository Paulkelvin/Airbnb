import Link from "next/link";
import { AdminPageHeader, AdminTableCard } from "../../AdminUI";
import { getAdminPages } from "@/modules/cms/queries";
import PagesTable from "./PagesTable";

export const metadata = { title: "Pages" };

export default async function AdminPagesPage() {
  const pages = await getAdminPages();

  return (
    <div>
      <AdminPageHeader
        title="Pages"
        description={`${pages.length} page${pages.length === 1 ? "" : "s"}`}
        actions={
          <Link
            href={"/admin/content/pages/new" as never}
            className="inline-flex items-center gap-2 rounded-lg bg-primary-6000 text-white text-sm font-medium px-4 py-2 hover:bg-primary-700 transition-colors"
          >
            New page
          </Link>
        }
      />
      <AdminTableCard>
        <PagesTable pages={pages} />
      </AdminTableCard>
    </div>
  );
}
