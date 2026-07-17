import Link from "next/link";
import { AdminPageHeader, AdminTableCard } from "../../AdminUI";
import { getAdminPosts } from "@/modules/cms/queries";
import PostsTable from "./PostsTable";

export const metadata = { title: "Blog Posts" };

export default async function AdminPostsPage() {
  const posts = await getAdminPosts();

  return (
    <div>
      <AdminPageHeader
        title="Blog Posts"
        description={`${posts.length} post${posts.length === 1 ? "" : "s"}`}
        actions={
          <Link
            href={"/admin/content/posts/new" as never}
            className="inline-flex items-center gap-2 rounded-lg bg-primary-6000 text-white text-sm font-medium px-4 py-2 hover:bg-primary-700 transition-colors"
          >
            New post
          </Link>
        }
      />
      <AdminTableCard>
        <PostsTable posts={posts} />
      </AdminTableCard>
    </div>
  );
}
