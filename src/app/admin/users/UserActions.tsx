"use client";

import React, { useTransition } from "react";
import { useRouter } from "next/navigation";
import { suspendUser, unsuspendUser, verifyUser, setAdminRole } from "@/modules/admin/actions";

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
  const router = useRouter();

  function handleAction(action: () => Promise<unknown>) {
    startTransition(async () => {
      await action();
      router.refresh();
    });
  }

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
      {!isVerified && (
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
    </div>
  );
}
