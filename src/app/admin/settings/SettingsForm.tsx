"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updatePlatformSetting } from "@/modules/admin/actions";

export function SettingsForm({ settings }: { settings: Record<string, string> }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const [moderationEnabled, setModerationEnabled] = useState(settings.listingModerationEnabled === "true");
  const [serviceFee, setServiceFee] = useState(settings.serviceFeePercent ?? "10");
  const [saved, setSaved] = useState(false);

  function handleSave() {
    startTransition(async () => {
      await Promise.all([
        updatePlatformSetting("listingModerationEnabled", String(moderationEnabled)),
        updatePlatformSetting("serviceFeePercent", serviceFee),
      ]);
      setSaved(true);
      router.refresh();
      setTimeout(() => setSaved(false), 2000);
    });
  }

  return (
    <div className="max-w-xl space-y-8">
      <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-6 space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-1">
            Listing Moderation
          </h3>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">
            When enabled, new listings require admin approval before they become
            publicly visible. When disabled, hosts can publish directly.
          </p>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={moderationEnabled}
              onChange={(e) => setModerationEnabled(e.target.checked)}
              className="w-5 h-5 rounded border-neutral-300 text-primary-6000 focus:ring-primary-500"
            />
            <span className="text-sm text-neutral-700 dark:text-neutral-200">
              Require admin approval for new listings
            </span>
          </label>
        </div>

        <div className="border-t border-neutral-200 dark:border-neutral-700 pt-6">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-1">
            Service Fee
          </h3>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">
            Percentage fee charged to guests on short-term bookings.
          </p>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              max="50"
              step="0.5"
              value={serviceFee}
              onChange={(e) => setServiceFee(e.target.value)}
              className="w-24 px-3 py-2 text-sm border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
            />
            <span className="text-sm text-neutral-500">%</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={isPending}
          className="px-6 py-2.5 text-sm rounded-lg bg-primary-6000 text-white hover:bg-primary-700 disabled:opacity-50"
        >
          {isPending ? "Saving..." : "Save Settings"}
        </button>
        {saved && (
          <span className="text-sm text-green-600 dark:text-green-400">
            Settings saved
          </span>
        )}
      </div>
    </div>
  );
}
