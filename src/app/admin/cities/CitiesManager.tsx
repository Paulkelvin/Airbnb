"use client";

import React, { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { createCity, updateCity, deleteCity } from "@/modules/admin/actions";

interface CityItem {
  id: string;
  name: string;
  region: string;
  slug: string;
  isActive: boolean;
}

export function CitiesManager({ cities }: { cities: CityItem[] }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [newName, setNewName] = useState("");
  const [newRegion, setNewRegion] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingRegion, setEditingRegion] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return cities;
    const q = search.trim().toLowerCase();
    return cities.filter((c) => c.name.toLowerCase().includes(q) || c.region.toLowerCase().includes(q));
  }, [cities, search]);

  function handleCreate() {
    if (!newName.trim() || !newRegion.trim()) return;
    setError(null);
    startTransition(async () => {
      const result = await createCity({ name: newName.trim(), region: newRegion.trim() });
      if (!result.success) {
        setError(result.error.message);
        return;
      }
      setNewName("");
      setNewRegion("");
      router.refresh();
    });
  }

  function startEditing(city: CityItem) {
    setError(null);
    setEditingId(city.id);
    setEditingName(city.name);
    setEditingRegion(city.region);
  }

  function handleRename(id: string) {
    if (!editingName.trim() || !editingRegion.trim()) return;
    setError(null);
    startTransition(async () => {
      const result = await updateCity(id, { name: editingName.trim(), region: editingRegion.trim() });
      if (!result.success) {
        setError(result.error.message);
        return;
      }
      setEditingId(null);
      router.refresh();
    });
  }

  function handleToggle(id: string, isActive: boolean) {
    startTransition(async () => {
      await updateCity(id, { isActive: !isActive });
      router.refresh();
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const result = await deleteCity(id);
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

      <div className="flex flex-wrap gap-2">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="City name"
          className={`flex-1 min-w-[160px] ${inputClass}`}
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
        />
        <input
          type="text"
          value={newRegion}
          onChange={(e) => setNewRegion(e.target.value)}
          placeholder="State (e.g. NY)"
          maxLength={2}
          className={`w-28 uppercase ${inputClass}`}
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
        />
        <button
          onClick={handleCreate}
          disabled={isPending || !newName.trim() || !newRegion.trim()}
          className="px-4 py-2 text-sm rounded-lg bg-primary-6000 text-white hover:bg-primary-700 disabled:opacity-50"
        >
          Add city
        </button>
      </div>

      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={`Search ${cities.length} cities by name or state...`}
        className={`w-full ${inputClass}`}
      />

      <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 divide-y divide-neutral-100 dark:divide-neutral-700 max-h-[32rem] overflow-y-auto">
        {filtered.map((city) => (
          <div key={city.id} className="flex items-center justify-between px-4 py-3 gap-2">
            {editingId === city.id ? (
              <div className="flex flex-1 gap-2 min-w-0">
                <input
                  autoFocus
                  type="text"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleRename(city.id);
                    if (e.key === "Escape") setEditingId(null);
                  }}
                  className={`flex-1 min-w-0 ${inputClass}`}
                />
                <input
                  type="text"
                  value={editingRegion}
                  onChange={(e) => setEditingRegion(e.target.value)}
                  maxLength={2}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleRename(city.id);
                    if (e.key === "Escape") setEditingId(null);
                  }}
                  className={`w-20 uppercase ${inputClass}`}
                />
              </div>
            ) : (
              <div className="min-w-0">
                <span className={`text-sm ${city.isActive ? "text-neutral-900 dark:text-neutral-100" : "text-neutral-400 line-through"}`}>
                  {city.name}
                </span>
                <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400">
                  {city.region}
                </span>
              </div>
            )}
            <div className="flex items-center gap-1 flex-shrink-0">
              {editingId === city.id ? (
                <>
                  <button
                    onClick={() => handleRename(city.id)}
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
                    onClick={() => startEditing(city)}
                    className="px-2 py-1 text-xs rounded text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-700"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleToggle(city.id, city.isActive)}
                    disabled={isPending}
                    className={`px-2 py-1 text-xs rounded ${
                      city.isActive
                        ? "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400"
                        : "bg-neutral-100 text-neutral-500 dark:bg-neutral-700 dark:text-neutral-400"
                    } disabled:opacity-50`}
                  >
                    {city.isActive ? "Active" : "Inactive"}
                  </button>
                  <button
                    onClick={() => setDeleteTarget({ id: city.id, name: city.name })}
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
        {filtered.length === 0 && (
          <p className="px-4 py-10 text-center text-sm text-neutral-400">No cities match your search.</p>
        )}
      </div>

      <ConfirmModal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) handleDelete(deleteTarget.id);
        }}
        title="Delete city"
        message={`Remove "${deleteTarget?.name}" from the curated list? Hosts who already used this city keep their listing as-is; it just won't be searchable or appear in Top Cities anymore. Consider marking it inactive instead if you might want it back.`}
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
}
