"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { createFaq, updateFaq, deleteFaq, type FaqFormInput } from "@/modules/cms/actions";
import type { CmsFaqItem } from "@/modules/cms/queries";

const emptyForm: FaqFormInput = { question: "", answer: "", category: "", order: 0 };

export default function FaqManager({ faqs }: { faqs: CmsFaqItem[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FaqFormInput>(emptyForm);
  const [showNewForm, setShowNewForm] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  function startEdit(faq: CmsFaqItem) {
    setError(null);
    setShowNewForm(false);
    setEditingId(faq._id);
    setForm({ question: faq.question, answer: faq.answer, category: faq.category, order: faq.order });
  }

  function startNew() {
    setError(null);
    setEditingId(null);
    setForm(emptyForm);
    setShowNewForm(true);
  }

  function cancel() {
    setEditingId(null);
    setShowNewForm(false);
  }

  function save() {
    startTransition(async () => {
      const result = editingId ? await updateFaq(editingId, form) : await createFaq(form);
      if (!result.success) {
        setError(result.error.message);
        return;
      }
      setEditingId(null);
      setShowNewForm(false);
      router.refresh();
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const result = await deleteFaq(id);
      if (!result.success) setError(result.error.message);
      router.refresh();
    });
  }

  const inputClass =
    "w-full px-3 py-2 text-sm border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100";

  const formFields = (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input
          className={inputClass}
          placeholder="Category (e.g. Booking)"
          value={form.category}
          onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
        />
        <input
          type="number"
          className={inputClass}
          placeholder="Order (lower shows first)"
          value={form.order}
          onChange={(e) => setForm((f) => ({ ...f, order: Number(e.target.value) }))}
        />
      </div>
      <input
        className={inputClass}
        placeholder="Question"
        value={form.question}
        onChange={(e) => setForm((f) => ({ ...f, question: e.target.value }))}
      />
      <textarea
        className={inputClass}
        rows={3}
        placeholder="Answer"
        value={form.answer}
        onChange={(e) => setForm((f) => ({ ...f, answer: e.target.value }))}
      />
      <div className="flex gap-2">
        <button
          onClick={save}
          disabled={isPending || !form.question.trim() || !form.answer.trim() || !form.category.trim()}
          className="px-4 py-2 text-sm rounded-lg bg-primary-6000 text-white hover:bg-primary-700 disabled:opacity-50"
        >
          Save
        </button>
        <button
          onClick={cancel}
          className="px-4 py-2 text-sm rounded-lg text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-700"
        >
          Cancel
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 text-sm px-4 py-3">
          {error}
        </div>
      )}

      {!showNewForm && (
        <button
          onClick={startNew}
          className="px-4 py-2 text-sm rounded-lg bg-primary-6000 text-white hover:bg-primary-700"
        >
          New question
        </button>
      )}
      {showNewForm && (
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-4">
          {formFields}
        </div>
      )}

      <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 divide-y divide-neutral-100 dark:divide-neutral-700">
        {faqs.map((faq) =>
          editingId === faq._id ? (
            <div key={faq._id} className="p-4">
              {formFields}
            </div>
          ) : (
            <div key={faq._id} className="px-4 py-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <span className="text-xs px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400">
                  {faq.category}
                </span>
                <p className="mt-1 text-sm font-medium text-neutral-900 dark:text-neutral-100">
                  {faq.question}
                </p>
                <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400 line-clamp-2">
                  {faq.answer}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => startEdit(faq)}
                  className="px-2 py-1 text-xs rounded text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-700"
                >
                  Edit
                </button>
                <button
                  onClick={() => setDeleteId(faq._id)}
                  disabled={isPending}
                  className="px-2 py-1 text-xs rounded bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 disabled:opacity-50"
                >
                  Delete
                </button>
              </div>
            </div>
          ),
        )}
        {faqs.length === 0 && (
          <p className="px-4 py-10 text-center text-sm text-neutral-400">No FAQs yet.</p>
        )}
      </div>

      <ConfirmModal
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && handleDelete(deleteId)}
        title="Delete question"
        message="This removes the question from the Help Centre page. This cannot be undone."
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
}
