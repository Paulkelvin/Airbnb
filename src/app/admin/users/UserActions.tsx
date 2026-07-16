"use client";

import React, { useTransition } from "react";
import { useRouter } from "next/navigation";
import { suspendUser, unsuspendUser, verifyUser } from "@/modules/admin/actions";

export function UserActions({
  userId,
  status,
  isVerified,
}: {
  userId: string;
  status: string;
  isVerified: boolean;
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
    </div>
  );
}
