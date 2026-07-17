import { AdminPageHeader } from "../../../AdminUI";
import { getAdminAuthors, getAdminCategories } from "@/modules/cms/queries";
import PostForm from "../PostForm";

export const metadata = { title: "New Post" };

export default async function NewPostPage() {
  const [authors, categories] = await Promise.all([getAdminAuthors(), getAdminCategories()]);
  return (
    <div>
      <AdminPageHeader title="New post" />
      <PostForm authors={authors} categories={categories} />
    </div>
  );
}
