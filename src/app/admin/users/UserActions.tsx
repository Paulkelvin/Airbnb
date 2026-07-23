"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { suspendUser, unsuspendUser, verifyUser, setAdminRole, deleteUser } from "@/modules/admin/actions";

export function UserActions({
  userId,
  status,
  isVerified,
  roles,
  isSelf,
}: {
  userId: string;
  status: string;
  isVerified: boolean;
  roles: string[];
  isSelf: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const router = useRouter();

  function handleAction(action: () => Promise<unknown>) {
    startTransition(async () => {
      await action();
      router.refresh();
    });
  }

  if (status === "DELETED") return null;

  return (
    <div className="flex gap-1 flex-wrap">
      {status === "ACTIVE" && (
        <button
          onClick={() => handleAction(() => suspendUser(userId))}
          disabled={isPending}
          className="px-2 py-1 text-xs rounded bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40 disabled:opacity-50"
        >
          Suspend
        </button>
      )}
      {status === "SUSPENDED" && (
        <button
          onClick={() => handleAction(() => unsuspendUser(userId))}
          disabled={isPending}
          className="px-2 py-1 text-xs rounded bg-green-50 text-green-600 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/40 disabled:opacity-50"
        >
          Unsuspend
        </button>
      )}
      {!isVerified && status === "ACTIVE" && (
        <button
          onClick={() => handleAction(() => verifyUser(userId))}
          disabled={isPending}
          className="px-2 py-1 text-xs rounded bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/40 disabled:opacity-50"
        >
          Verify
        </button>
      )}
      {roles.includes("ADMIN") ? (
        <button
          onClick={() => handleAction(() => setAdminRole(userId, false))}
          disabled={isPending || isSelf}
          title={isSelf ? "You cannot remove your own admin access" : undefined}
          className="px-2 py-1 text-xs rounded bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-600 disabled:opacity-50"
        >
          Revoke admin
        </button>
      ) : (
        <button
          onClick={() => handleAction(() => setAdminRole(userId, true))}
          disabled={isPending}
          className="px-2 py-1 text-xs rounded bg-purple-50 text-purple-600 hover:bg-purple-100 dark:bg-purple-900/20 dark:text-purple-400 dark:hover:bg-purple-900/40 disabled:opacity-50"
        >
          Make admin
        </button>
      )}
      {!isSelf && (
        showDeleteConfirm ? (
          <span className="inline-flex gap-1 items-center">
            <button
              onClick={() => {
                handleAction(() => deleteUser(userId));
                setShowDeleteConfirm(false);
              }}
              disabled={isPending}
              className="px-2 py-1 text-xs rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
            >
              Confirm
            </button>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              disabled={isPending}
              className="px-2 py-1 text-xs rounded bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-600 disabled:opacity-50"
            >
              Cancel
            </button>
          </span>
        ) : (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            disabled={isPending}
            className="px-2 py-1 text-xs rounded bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40 disabled:opacity-50"
          >
            Delete
          </button>
        )
      )}
    </div>
  );
}
