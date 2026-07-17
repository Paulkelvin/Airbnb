"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AdminBadge } from "../../AdminUI";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { deletePost } from "@/modules/cms/actions";
import type { CmsPostListItem } from "@/modules/cms/queries";

export default function PostsTable({ posts }: { posts: CmsPostListItem[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleDelete(id: string) {
    startTransition(async () => {
      const result = await deletePost(id);
      if (!result.success) setError(result.error.message);
      router.refresh();
    });
  }

  if (posts.length === 0) {
    return <p className="px-4 py-10 text-center text-sm text-neutral-400">No posts yet.</p>;
  }

  return (
    <>
      {error && (
        <div className="px-4 py-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-200 dark:border-neutral-700 text-left">
            <th className="px-4 py-3 font-medium text-neutral-500 dark:text-neutral-400">Title</th>
            <th className="px-4 py-3 font-medium text-neutral-500 dark:text-neutral-400">Author</th>
            <th className="px-4 py-3 font-medium text-neutral-500 dark:text-neutral-400">Status</th>
            <th className="px-4 py-3 font-medium text-neutral-500 dark:text-neutral-400">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700">
          {posts.map((post) => {
            const isPublished = Boolean(post.publishedAt && new Date(post.publishedAt) <= new Date());
            return (
              <tr key={post._id}>
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/content/posts/${post._id}` as never}
                    className="font-medium text-neutral-900 dark:text-neutral-100 hover:text-primary-6000"
                  >
                    {post.title}
                  </Link>
                </td>
                <td className="px-4 py-3 text-neutral-600 dark:text-neutral-300">
                  {post.authorName ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <AdminBadge tone={isPublished ? "green" : "gray"}>
                    {isPublished ? "Published" : "Draft"}
                  </AdminBadge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/admin/content/posts/${post._id}` as never}
                      className="text-sm font-medium text-primary-6000 hover:underline"
                    >
                      Edit
                    </Link>
                    <button
                      onClick={() => setConfirmId(post._id)}
                      disabled={isPending}
                      className="text-sm font-medium text-red-600 hover:underline disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <ConfirmModal
        open={confirmId !== null}
        onClose={() => setConfirmId(null)}
        onConfirm={() => confirmId && handleDelete(confirmId)}
        title="Delete post"
        message="This permanently deletes the post from Sanity. This cannot be undone."
        confirmLabel="Delete"
        variant="danger"
      />
    </>
  );
}
