"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import ConfirmModal from "@/components/ui/ConfirmModal";
import {
  createLocalExperience,
  updateLocalExperience,
  deleteLocalExperience,
  type LocalExperienceFormInput,
} from "@/modules/cms/actions";
import type { CmsLocalExperienceItem } from "@/modules/cms/queries";
import { EXPERIENCE_CATEGORIES, CATEGORY_EMOJI } from "@/data/local-experiences";

// The form manages the gallery as a textarea (one URL per line) rather than
// an array field directly — same idea as PageForm's plain-text body editor,
// simplest thing that works without building a repeatable-field widget.
interface FormState extends Omit<LocalExperienceFormInput, "galleryImageUrls" | "latitude" | "longitude"> {
  galleryImageUrlsText: string;
  latitude: string;
  longitude: string;
}

const emptyForm: FormState = {
  title: "",
  slug: "",
  category: EXPERIENCE_CATEGORIES[0],
  tagline: "",
  description: "",
  imageUrl: "",
  galleryImageUrlsText: "",
  distanceLabel: "",
  latitude: "",
  longitude: "",
  openingHours: "",
  websiteUrl: "",
  featured: false,
  order: 0,
  publishedAt: new Date().toISOString(),
};

function toFormState(a: CmsLocalExperienceItem): FormState {
  return {
    title: a.title,
    slug: a.slug,
    category: a.category,
    tagline: a.tagline,
    description: a.description,
    imageUrl: a.imageUrl,
    galleryImageUrlsText: a.galleryImageUrls.join("\n"),
    distanceLabel: a.distanceLabel,
    latitude: a.latitude?.toString() ?? "",
    longitude: a.longitude?.toString() ?? "",
    openingHours: a.openingHours ?? "",
    websiteUrl: a.websiteUrl ?? "",
    featured: a.featured,
    order: a.order,
    publishedAt: a.publishedAt,
  };
}

export default function LocalExperiencesManager({
  experiences,
}: {
  experiences: CmsLocalExperienceItem[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [showNewForm, setShowNewForm] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [visible, setVisible] = useState(true);

  function startEdit(a: CmsLocalExperienceItem) {
    setError(null);
    setShowNewForm(false);
    setEditingId(a._id);
    setForm(toFormState(a));
    setVisible(Boolean(a.publishedAt));
  }

  function startNew() {
    setError(null);
    setEditingId(null);
    setForm(emptyForm);
    setVisible(true);
    setShowNewForm(true);
  }

  function cancel() {
    setEditingId(null);
    setShowNewForm(false);
  }

  function save() {
    const input: LocalExperienceFormInput = {
      title: form.title,
      slug: form.slug,
      category: form.category,
      tagline: form.tagline,
      description: form.description,
      imageUrl: form.imageUrl,
      galleryImageUrls: form.galleryImageUrlsText.split("\n").map((u) => u.trim()).filter(Boolean),
      distanceLabel: form.distanceLabel,
      latitude: form.latitude.trim() ? Number(form.latitude) : null,
      longitude: form.longitude.trim() ? Number(form.longitude) : null,
      openingHours: form.openingHours,
      websiteUrl: form.websiteUrl,
      featured: form.featured,
      order: form.order,
      publishedAt: visible ? new Date().toISOString() : null,
    };
    startTransition(async () => {
      const result = editingId
        ? await updateLocalExperience(editingId, input)
        : await createLocalExperience(input);
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
      const result = await deleteLocalExperience(id);
      if (!result.success) setError(result.error.message);
      router.refresh();
    });
  }

  const inputClass =
    "w-full px-3 py-2 text-sm border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100";
  const labelClass = "block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1";

  const formFields = (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Title</label>
          <input
            className={inputClass}
            placeholder="e.g. Riverbend Park"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          />
        </div>
        <div>
          <label className={labelClass}>Category</label>
          <select
            className={inputClass}
            value={form.category}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
          >
            {EXPERIENCE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_EMOJI[c]} {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className={labelClass}>URL slug (optional — auto-generated from title if left blank)</label>
        <input
          className={inputClass}
          placeholder="riverbend-park"
          value={form.slug}
          onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
        />
      </div>

      <div>
        <label className={labelClass}>Tagline — the one-line hook shown on cards</label>
        <input
          className={inputClass}
          placeholder="e.g. Ideal for morning walks and sunset views"
          value={form.tagline}
          onChange={(e) => setForm((f) => ({ ...f, tagline: e.target.value }))}
        />
      </div>

      <div>
        <label className={labelClass}>Description — longer narrative for its own page</label>
        <textarea
          className={inputClass}
          rows={3}
          placeholder="A paragraph guests will actually read"
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Main image URL</label>
          <input
            className={inputClass}
            placeholder="https://..."
            value={form.imageUrl}
            onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))}
          />
        </div>
        <div>
          <label className={labelClass}>Distance from the cottage</label>
          <input
            className={inputClass}
            placeholder="e.g. 10 min drive"
            value={form.distanceLabel}
            onChange={(e) => setForm((f) => ({ ...f, distanceLabel: e.target.value }))}
          />
        </div>
      </div>

      <div>
        <label className={labelClass}>Gallery image URLs (optional — one per line)</label>
        <textarea
          className={`${inputClass} font-mono text-xs`}
          rows={3}
          placeholder={"https://...\nhttps://..."}
          value={form.galleryImageUrlsText}
          onChange={(e) => setForm((f) => ({ ...f, galleryImageUrlsText: e.target.value }))}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Latitude (optional — powers the map)</label>
          <input
            className={inputClass}
            placeholder="38.9977"
            value={form.latitude}
            onChange={(e) => setForm((f) => ({ ...f, latitude: e.target.value }))}
          />
        </div>
        <div>
          <label className={labelClass}>Longitude (optional — powers the map)</label>
          <input
            className={inputClass}
            placeholder="-77.2472"
            value={form.longitude}
            onChange={(e) => setForm((f) => ({ ...f, longitude: e.target.value }))}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Opening hours (optional)</label>
          <input
            className={inputClass}
            placeholder="e.g. Daily, 9am–6pm"
            value={form.openingHours}
            onChange={(e) => setForm((f) => ({ ...f, openingHours: e.target.value }))}
          />
        </div>
        <div>
          <label className={labelClass}>Website / map link (optional)</label>
          <input
            className={inputClass}
            placeholder="https://..."
            value={form.websiteUrl}
            onChange={(e) => setForm((f) => ({ ...f, websiteUrl: e.target.value }))}
          />
        </div>
      </div>

      <div>
        <label className={labelClass}>Order (lower shows first within its category)</label>
        <input
          type="number"
          className={`${inputClass} sm:w-48`}
          value={form.order}
          onChange={(e) => setForm((f) => ({ ...f, order: Number(e.target.value) }))}
        />
      </div>

      <div className="flex items-center gap-6">
        <label className="flex items-center gap-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
          <input
            type="checkbox"
            checked={form.featured}
            onChange={(e) => setForm((f) => ({ ...f, featured: e.target.checked }))}
          />
          Featured on homepage
        </label>
        <label className="flex items-center gap-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
          <input type="checkbox" checked={visible} onChange={(e) => setVisible(e.target.checked)} />
          Visible to guests
        </label>
      </div>

      <div className="flex gap-2">
        <button
          onClick={save}
          disabled={isPending || !form.title.trim() || !form.imageUrl.trim()}
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
          New local experience
        </button>
      )}
      {showNewForm && (
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-4">
          {formFields}
        </div>
      )}

      <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 divide-y divide-neutral-100 dark:divide-neutral-700">
        {experiences.map((a) =>
          editingId === a._id ? (
            <div key={a._id} className="p-4">
              {formFields}
            </div>
          ) : (
            <div key={a._id} className="px-4 py-3 flex items-start justify-between gap-3">
              <div className="min-w-0 flex items-start gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={a.imageUrl}
                  alt=""
                  className="w-14 h-14 rounded-lg object-cover flex-shrink-0 bg-neutral-100 dark:bg-neutral-700"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400">
                      {CATEGORY_EMOJI[a.category]} {a.category}
                    </span>
                    {a.featured && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-primary-50 dark:bg-primary-900/30 text-primary-6000">
                        Featured
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm font-medium text-neutral-900 dark:text-neutral-100">
                    {a.title}
                  </p>
                  <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400 line-clamp-1">
                    {a.tagline || a.description}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => startEdit(a)}
                  className="px-2 py-1 text-xs rounded text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-700"
                >
                  Edit
                </button>
                <button
                  onClick={() => setDeleteId(a._id)}
                  disabled={isPending}
                  className="px-2 py-1 text-xs rounded bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 disabled:opacity-50"
                >
                  Delete
                </button>
              </div>
            </div>
          ),
        )}
        {experiences.length === 0 && (
          <p className="px-4 py-10 text-center text-sm text-neutral-400">No local experiences yet.</p>
        )}
      </div>

      <ConfirmModal
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && handleDelete(deleteId)}
        title="Delete local experience"
        message="This removes it from the Explore the Area section. This cannot be undone."
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
}
