import { getAuditLogs } from "@/modules/admin/queries";
import Link from "next/link";

export const metadata = { title: "Audit Log" };

export default async function AdminAuditLogPage({
  searchParams,
}: {
  searchParams: { page?: string; targetType?: string };
}) {
  const page = Number(searchParams.page) || 1;
  const { logs, total, totalPages } = await getAuditLogs({
    page,
    targetType: searchParams.targetType,
  });

  const TARGET_TYPES = ["ALL", "User", "Listing", "Booking", "Review", "Conversation", "Payment", "PlatformSetting"];

  return (
    <div>
      <h2 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100 mb-6">
        Audit Log
      </h2>

      <div className="flex gap-2 mb-4 flex-wrap">
        {TARGET_TYPES.map((t) => {
          const isActive = (searchParams.targetType ?? "ALL") === t;
          const href = t === "ALL" ? "/admin/audit-log" : `/admin/audit-log?targetType=${t}`;
          return (
            <Link
              key={t}
              href={href as never}
              className={`px-3 py-1.5 text-sm rounded-full border ${
                isActive
                  ? "bg-primary-6000 text-white border-primary-6000"
                  : "border-neutral-300 dark:border-neutral-600 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700"
              }`}
            >
              {t}
            </Link>
          );
        })}
      </div>

      <div className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 dark:border-neutral-700 text-left">
              <th className="px-4 py-3 font-medium text-neutral-500 dark:text-neutral-400">Timestamp</th>
              <th className="px-4 py-3 font-medium text-neutral-500 dark:text-neutral-400">Actor</th>
              <th className="px-4 py-3 font-medium text-neutral-500 dark:text-neutral-400">Action</th>
              <th className="px-4 py-3 font-medium text-neutral-500 dark:text-neutral-400">Target</th>
              <th className="px-4 py-3 font-medium text-neutral-500 dark:text-neutral-400">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700">
            {logs.map((log) => (
              <tr key={log.id}>
                <td className="px-4 py-3 text-neutral-500 dark:text-neutral-400 text-xs whitespace-nowrap">
                  {new Date(log.createdAt).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-neutral-600 dark:text-neutral-300">
                  {log.actor
                    ? `${log.actor.firstName} ${log.actor.lastName}`
                    : "System"}
                  {log.actor && (
                    <div className="text-xs text-neutral-400">{log.actor.email}</div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 text-xs rounded bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200 font-mono">
                    {log.action}
                  </span>
                </td>
                <td className="px-4 py-3 text-neutral-600 dark:text-neutral-300 text-xs">
                  <span className="text-neutral-400">{log.targetType}:</span>{" "}
                  <span className="font-mono">{log.targetId.slice(0, 8)}...</span>
                </td>
                <td className="px-4 py-3 text-neutral-500 dark:text-neutral-400 text-xs max-w-xs truncate">
                  {log.metadata ? JSON.stringify(log.metadata) : "—"}
                </td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-neutral-500 dark:text-neutral-400">
                  No audit log entries found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={`/admin/audit-log?page=${p}${searchParams.targetType ? `&targetType=${searchParams.targetType}` : ""}` as never}
              className={`px-3 py-1 text-sm rounded ${
                p === page
                  ? "bg-primary-6000 text-white"
                  : "bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300"
              }`}
            >
              {p}
            </Link>
          ))}
        </div>
      )}

      <p className="mt-2 text-xs text-neutral-400 text-center">{total} total entries</p>
    </div>
  );
}
