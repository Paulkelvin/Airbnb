"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createPropertyType,
  updatePropertyType,
  createAmenity,
  updateAmenity,
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

  function handleCreateAmenity() {
    if (!newAmenity.trim()) return;
    startTransition(async () => {
      await createAmenity({ name: newAmenity.trim() });
      setNewAmenity("");
      router.refresh();
    });
  }

  function handleToggleAmenity(id: string, isActive: boolean) {
    startTransition(async () => {
      await updateAmenity(id, { isActive: !isActive });
      router.refresh();
    });
  }

  return (
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
            <div key={pt.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <span className={`text-sm ${pt.isActive ? "text-neutral-900 dark:text-neutral-100" : "text-neutral-400 line-through"}`}>
                  {pt.name}
                </span>
                <span className="ml-2 text-xs text-neutral-400">{pt.slug}</span>
              </div>
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
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={newAmenity}
            onChange={(e) => setNewAmenity(e.target.value)}
            placeholder="New amenity name"
            className="flex-1 px-3 py-2 text-sm border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
            onKeyDown={(e) => e.key === "Enter" && handleCreateAmenity()}
          />
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
            <div key={a.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <span className={`text-sm ${a.isActive ? "text-neutral-900 dark:text-neutral-100" : "text-neutral-400 line-through"}`}>
                  {a.name}
                </span>
                {a.category && (
                  <span className="ml-2 text-xs text-neutral-400">{a.category}</span>
                )}
              </div>
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
            </div>
          ))}
          {amenities.length === 0 && (
            <p className="px-4 py-6 text-sm text-neutral-400 text-center">No amenities yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
