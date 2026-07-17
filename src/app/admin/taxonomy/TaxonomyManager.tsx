"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createPropertyType,
  updatePropertyType,
  deletePropertyType,
  createAmenity,
  updateAmenity,
  deleteAmenity,
} from "@/modules/admin/actions";

interface PropertyTypeItem {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  isActive: boolean;
}

interface AmenityItem {
  id: string;
  name: string;
  slug: string;
  category: string | null;
  icon: string | null;
  isActive: boolean;
}

const AMENITY_CATEGORIES = [
  { value: "", label: "No category" },
  { value: "BASIC", label: "Basic" },
  { value: "SAFETY", label: "Safety" },
  { value: "OUTDOOR", label: "Outdoor" },
  { value: "KITCHEN", label: "Kitchen" },
  { value: "ENTERTAINMENT", label: "Entertainment" },
  { value: "ACCESSIBILITY", label: "Accessibility" },
  { value: "PARKING", label: "Parking" },
  { value: "CLIMATE", label: "Climate" },
] as const;

export function TaxonomyManager({
  propertyTypes,
  amenities,
}: {
  propertyTypes: PropertyTypeItem[];
  amenities: AmenityItem[];
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const [newPT, setNewPT] = useState("");
  const [newAmenity, setNewAmenity] = useState("");
  const [newAmenityCategory, setNewAmenityCategory] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [editingCategory, setEditingCategory] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleCreatePT() {
    if (!newPT.trim()) return;
    startTransition(async () => {
      await createPropertyType({ name: newPT.trim() });
      setNewPT("");
      router.refresh();
    });
  }

  function handleTogglePT(id: string, isActive: boolean) {
    startTransition(async () => {
      await updatePropertyType(id, { isActive: !isActive });
      router.refresh();
    });
  }

  function handleRenamePT(id: string) {
    if (!editingValue.trim()) return;
    startTransition(async () => {
      setError(null);
      await updatePropertyType(id, { name: editingValue.trim() });
      setEditingId(null);
      router.refresh();
    });
  }

  function handleDeletePT(id: string, name: string) {
    if (!window.confirm(`Delete property type "${name}"? This cannot be undone.`)) return;
    startTransition(async () => {
      setError(null);
      const result = await deletePropertyType(id);
      if (!result.success) setError(result.error.message);
      router.refresh();
    });
  }

  function handleCreateAmenity() {
    if (!newAmenity.trim()) return;
    startTransition(async () => {
      await createAmenity({ name: newAmenity.trim(), category: newAmenityCategory || undefined });
      setNewAmenity("");
      setNewAmenityCategory("");
      router.refresh();
    });
  }

  function handleToggleAmenity(id: string, isActive: boolean) {
    startTransition(async () => {
      await updateAmenity(id, { isActive: !isActive });
      router.refresh();
    });
  }

  function handleRenameAmenity(id: string) {
    if (!editingValue.trim()) return;
    startTransition(async () => {
      setError(null);
      await updateAmenity(id, { name: editingValue.trim(), category: editingCategory });
      setEditingId(null);
      router.refresh();
    });
  }

  function handleDeleteAmenity(id: string, name: string) {
    if (!window.confirm(`Delete amenity "${name}"? This cannot be undone.`)) return;
    startTransition(async () => {
      setError(null);
      const result = await deleteAmenity(id);
      if (!result.success) setError(result.error.message);
      router.refresh();
    });
  }

  function startEditing(id: string, currentName: string, currentCategory?: string | null) {
    setError(null);
    setEditingId(id);
    setEditingValue(currentName);
    setEditingCategory(currentCategory ?? "");
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 text-sm px-4 py-3">
          {error}
        </div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div>
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
          Property Types
        </h3>
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={newPT}
            onChange={(e) => setNewPT(e.target.value)}
            placeholder="New property type name"
            className="flex-1 px-3 py-2 text-sm border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
            onKeyDown={(e) => e.key === "Enter" && handleCreatePT()}
          />
          <button
            onClick={handleCreatePT}
            disabled={isPending || !newPT.trim()}
            className="px-4 py-2 text-sm rounded-lg bg-primary-6000 text-white hover:bg-primary-700 disabled:opacity-50"
          >
            Add
          </button>
        </div>
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 divide-y divide-neutral-100 dark:divide-neutral-700">
          {propertyTypes.map((pt) => (
            <div key={pt.id} className="flex items-center justify-between px-4 py-3 gap-2">
              {editingId === pt.id ? (
                <input
                  autoFocus
                  type="text"
                  value={editingValue}
                  onChange={(e) => setEditingValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleRenamePT(pt.id);
                    if (e.key === "Escape") setEditingId(null);
                  }}
                  className="flex-1 px-2 py-1 text-sm border border-neutral-300 dark:border-neutral-600 rounded bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                />
              ) : (
                <div className="min-w-0">
                  <span className={`text-sm ${pt.isActive ? "text-neutral-900 dark:text-neutral-100" : "text-neutral-400 line-through"}`}>
                    {pt.name}
                  </span>
                  <span className="ml-2 text-xs text-neutral-400">{pt.slug}</span>
                </div>
              )}
              <div className="flex items-center gap-1 flex-shrink-0">
                {editingId === pt.id ? (
                  <>
                    <button
                      onClick={() => handleRenamePT(pt.id)}
                      disabled={isPending}
                      className="px-2 py-1 text-xs rounded bg-primary-6000 text-white hover:bg-primary-700 disabled:opacity-50"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="px-2 py-1 text-xs rounded text-neutral-400 hover:text-neutral-600"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => startEditing(pt.id, pt.name)}
                      className="px-2 py-1 text-xs rounded text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-700"
                    >
                      Rename
                    </button>
                    <button
                      onClick={() => handleTogglePT(pt.id, pt.isActive)}
                      disabled={isPending}
                      className={`px-2 py-1 text-xs rounded ${
                        pt.isActive
                          ? "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400"
                          : "bg-neutral-100 text-neutral-500 dark:bg-neutral-700 dark:text-neutral-400"
                      } disabled:opacity-50`}
                    >
                      {pt.isActive ? "Active" : "Inactive"}
                    </button>
                    <button
                      onClick={() => handleDeletePT(pt.id, pt.name)}
                      disabled={isPending}
                      className="px-2 py-1 text-xs rounded bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
          {propertyTypes.length === 0 && (
            <p className="px-4 py-6 text-sm text-neutral-400 text-center">No property types yet</p>
          )}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
          Amenities
        </h3>
        <div className="flex flex-wrap gap-2 mb-4">
          <input
            type="text"
            value={newAmenity}
            onChange={(e) => setNewAmenity(e.target.value)}
            placeholder="New amenity name"
            className="flex-1 min-w-[160px] px-3 py-2 text-sm border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
            onKeyDown={(e) => e.key === "Enter" && handleCreateAmenity()}
          />
          <select
            value={newAmenityCategory}
            onChange={(e) => setNewAmenityCategory(e.target.value)}
            className="px-3 py-2 text-sm border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
          >
            {AMENITY_CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
          <button
            onClick={handleCreateAmenity}
            disabled={isPending || !newAmenity.trim()}
            className="px-4 py-2 text-sm rounded-lg bg-primary-6000 text-white hover:bg-primary-700 disabled:opacity-50"
          >
            Add
          </button>
        </div>
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 divide-y divide-neutral-100 dark:divide-neutral-700">
          {amenities.map((a) => (
            <div key={a.id} className="flex items-center justify-between px-4 py-3 gap-2">
              {editingId === a.id ? (
                <div className="flex flex-1 gap-2 min-w-0">
                  <input
                    autoFocus
                    type="text"
                    value={editingValue}
                    onChange={(e) => setEditingValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleRenameAmenity(a.id);
                      if (e.key === "Escape") setEditingId(null);
                    }}
                    className="flex-1 min-w-0 px-2 py-1 text-sm border border-neutral-300 dark:border-neutral-600 rounded bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                  />
                  <select
                    value={editingCategory}
                    onChange={(e) => setEditingCategory(e.target.value)}
                    className="px-2 py-1 text-sm border border-neutral-300 dark:border-neutral-600 rounded bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                  >
                    {AMENITY_CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="min-w-0">
                  <span className={`text-sm ${a.isActive ? "text-neutral-900 dark:text-neutral-100" : "text-neutral-400 line-through"}`}>
                    {a.name}
                  </span>
                  {a.category && (
                    <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400">
                      {a.category}
                    </span>
                  )}
                </div>
              )}
              <div className="flex items-center gap-1 flex-shrink-0">
                {editingId === a.id ? (
                  <>
                    <button
                      onClick={() => handleRenameAmenity(a.id)}
                      disabled={isPending}
                      className="px-2 py-1 text-xs rounded bg-primary-6000 text-white hover:bg-primary-700 disabled:opacity-50"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="px-2 py-1 text-xs rounded text-neutral-400 hover:text-neutral-600"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => startEditing(a.id, a.name, a.category)}
                      className="px-2 py-1 text-xs rounded text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-700"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleToggleAmenity(a.id, a.isActive)}
                      disabled={isPending}
                      className={`px-2 py-1 text-xs rounded ${
                        a.isActive
                          ? "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400"
                          : "bg-neutral-100 text-neutral-500 dark:bg-neutral-700 dark:text-neutral-400"
                      } disabled:opacity-50`}
                    >
                      {a.isActive ? "Active" : "Inactive"}
                    </button>
                    <button
                      onClick={() => handleDeleteAmenity(a.id, a.name)}
                      disabled={isPending}
                      className="px-2 py-1 text-xs rounded bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
          {amenities.length === 0 && (
            <p className="px-4 py-6 text-sm text-neutral-400 text-center">No amenities yet</p>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}
