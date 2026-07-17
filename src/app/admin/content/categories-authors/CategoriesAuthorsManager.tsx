"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import ConfirmModal from "@/components/ui/ConfirmModal";
import {
  createCategory,
  updateCategory,
  deleteCategory,
  createAuthor,
  updateAuthor,
  deleteAuthor,
} from "@/modules/cms/actions";
import type { CmsCategoryItem, CmsAuthorItem } from "@/modules/cms/queries";

export default function CategoriesAuthorsManager({
  categories,
  authors,
}: {
  categories: CmsCategoryItem[];
  authors: CmsAuthorItem[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [newCategory, setNewCategory] = useState("");
  const [newAuthor, setNewAuthor] = useState("");

  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editingCatTitle, setEditingCatTitle] = useState("");
  const [editingCatDesc, setEditingCatDesc] = useState("");

  const [editingAuthorId, setEditingAuthorId] = useState<string | null>(null);
  const [editingAuthorName, setEditingAuthorName] = useState("");
  const [editingAuthorBio, setEditingAuthorBio] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<{ kind: "category" | "author"; id: string; label: string } | null>(null);

  function handleCreateCategory() {
    if (!newCategory.trim()) return;
    startTransition(async () => {
      const result = await createCategory({ title: newCategory.trim() });
      if (!result.success) setError(result.error.message);
      setNewCategory("");
      router.refresh();
    });
  }

  function startEditCategory(c: CmsCategoryItem) {
    setError(null);
    setEditingCatId(c._id);
    setEditingCatTitle(c.title);
    setEditingCatDesc(c.description ?? "");
  }

  function saveEditCategory(id: string) {
    if (!editingCatTitle.trim()) return;
    startTransition(async () => {
      const result = await updateCategory(id, { title: editingCatTitle.trim(), description: editingCatDesc });
      if (!result.success) setError(result.error.message);
      setEditingCatId(null);
      router.refresh();
    });
  }

  function handleCreateAuthor() {
    if (!newAuthor.trim()) return;
    startTransition(async () => {
      const result = await createAuthor({ name: newAuthor.trim() });
      if (!result.success) setError(result.error.message);
      setNewAuthor("");
      router.refresh();
    });
  }

  function startEditAuthor(a: CmsAuthorItem) {
    setError(null);
    setEditingAuthorId(a._id);
    setEditingAuthorName(a.name);
    setEditingAuthorBio(a.bio ?? "");
  }

  function saveEditAuthor(id: string) {
    if (!editingAuthorName.trim()) return;
    startTransition(async () => {
      const result = await updateAuthor(id, { name: editingAuthorName.trim(), bio: editingAuthorBio });
      if (!result.success) setError(result.error.message);
      setEditingAuthorId(null);
      router.refresh();
    });
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    startTransition(async () => {
      const result =
        deleteTarget.kind === "category"
          ? await deleteCategory(deleteTarget.id)
          : await deleteAuthor(deleteTarget.id);
      if (!result.success) setError(result.error.message);
      router.refresh();
    });
  }

  const inputClass =
    "px-3 py-2 text-sm border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100";

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 text-sm px-4 py-3">
          {error}
        </div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">Categories</h3>
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder="New category name"
              className={`flex-1 ${inputClass}`}
              onKeyDown={(e) => e.key === "Enter" && handleCreateCategory()}
            />
            <button
              onClick={handleCreateCategory}
              disabled={isPending || !newCategory.trim()}
              className="px-4 py-2 text-sm rounded-lg bg-primary-6000 text-white hover:bg-primary-700 disabled:opacity-50"
            >
              Add
            </button>
          </div>
          <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 divide-y divide-neutral-100 dark:divide-neutral-700">
            {categories.map((c) => (
              <div key={c._id} className="px-4 py-3 space-y-2">
                {editingCatId === c._id ? (
                  <div className="space-y-2">
                    <input
                      autoFocus
                      className={`w-full ${inputClass}`}
                      value={editingCatTitle}
                      onChange={(e) => setEditingCatTitle(e.target.value)}
                    />
                    <textarea
                      className={`w-full ${inputClass}`}
                      rows={2}
                      placeholder="Description (optional)"
                      value={editingCatDesc}
                      onChange={(e) => setEditingCatDesc(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => saveEditCategory(c._id)}
                        disabled={isPending}
                        className="px-2 py-1 text-xs rounded bg-primary-6000 text-white hover:bg-primary-700 disabled:opacity-50"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingCatId(null)}
                        className="px-2 py-1 text-xs rounded text-neutral-400 hover:text-neutral-600"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-sm text-neutral-900 dark:text-neutral-100">{c.title}</span>
                      <span className="ml-2 text-xs text-neutral-400">{c.slug}</span>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => startEditCategory(c)}
                        className="px-2 py-1 text-xs rounded text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-700"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setDeleteTarget({ kind: "category", id: c._id, label: c.title })}
                        disabled={isPending}
                        className="px-2 py-1 text-xs rounded bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {categories.length === 0 && (
              <p className="px-4 py-6 text-sm text-neutral-400 text-center">No categories yet</p>
            )}
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">Authors</h3>
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={newAuthor}
              onChange={(e) => setNewAuthor(e.target.value)}
              placeholder="New author name"
              className={`flex-1 ${inputClass}`}
              onKeyDown={(e) => e.key === "Enter" && handleCreateAuthor()}
            />
            <button
              onClick={handleCreateAuthor}
              disabled={isPending || !newAuthor.trim()}
              className="px-4 py-2 text-sm rounded-lg bg-primary-6000 text-white hover:bg-primary-700 disabled:opacity-50"
            >
              Add
            </button>
          </div>
          <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 divide-y divide-neutral-100 dark:divide-neutral-700">
            {authors.map((a) => (
              <div key={a._id} className="px-4 py-3 space-y-2">
                {editingAuthorId === a._id ? (
                  <div className="space-y-2">
                    <input
                      autoFocus
                      className={`w-full ${inputClass}`}
                      value={editingAuthorName}
                      onChange={(e) => setEditingAuthorName(e.target.value)}
                    />
                    <textarea
                      className={`w-full ${inputClass}`}
                      rows={2}
                      placeholder="Bio (optional)"
                      value={editingAuthorBio}
                      onChange={(e) => setEditingAuthorBio(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => saveEditAuthor(a._id)}
                        disabled={isPending}
                        className="px-2 py-1 text-xs rounded bg-primary-6000 text-white hover:bg-primary-700 disabled:opacity-50"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingAuthorId(null)}
                        className="px-2 py-1 text-xs rounded text-neutral-400 hover:text-neutral-600"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-sm text-neutral-900 dark:text-neutral-100">{a.name}</span>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => startEditAuthor(a)}
                        className="px-2 py-1 text-xs rounded text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-700"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setDeleteTarget({ kind: "author", id: a._id, label: a.name })}
                        disabled={isPending}
                        className="px-2 py-1 text-xs rounded bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {authors.length === 0 && (
              <p className="px-4 py-6 text-sm text-neutral-400 text-center">No authors yet</p>
            )}
          </div>
        </div>
      </div>

      <ConfirmModal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title={`Delete ${deleteTarget?.kind}`}
        message={`Delete "${deleteTarget?.label}"? This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
}
