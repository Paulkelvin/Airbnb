import { notFound } from "next/navigation";
import { AdminPageHeader } from "../../../AdminUI";
import { getAdminAuthors, getAdminCategories, getAdminPost } from "@/modules/cms/queries";
import PostForm from "../PostForm";

export const metadata = { title: "Edit Post" };

export default async function EditPostPage({ params }: { params: { id: string } }) {
  const [post, authors, categories] = await Promise.all([
    getAdminPost(params.id),
    getAdminAuthors(),
    getAdminCategories(),
  ]);

  if (!post) notFound();

  return (
    <div>
      <AdminPageHeader title={`Edit: ${post.title}`} />
      <PostForm post={post} authors={authors} categories={categories} />
    </div>
  );
}
