import { getAuditLogs } from "@/modules/admin/queries";
import { AdminPageHeader, AdminFilterPills, AdminTableCard, AdminPagination } from "../AdminUI";

export const metadata = { title: "Audit Log" };

const TARGET_TYPES = ["ALL", "User", "Listing", "Booking", "Review", "Conversation", "Payment", "PlatformSetting"] as const;

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

  return (
    <div>
      <AdminPageHeader title="Audit Log" description={`${total} total entries`} />

      <AdminFilterPills
        options={TARGET_TYPES}
        activeValue={searchParams.targetType ?? "ALL"}
        basePath="/admin/audit-log"
        paramName="targetType"
      />

      <AdminTableCard>
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
                    ? [log.actor.firstName, log.actor.lastName].filter(Boolean).join(" ")
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
      </AdminTableCard>

      <AdminPagination
        page={page}
        totalPages={totalPages}
        basePath="/admin/audit-log"
        extraParams={searchParams.targetType ? `&targetType=${searchParams.targetType}` : ""}
      />
    </div>
  );
}
