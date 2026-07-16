import { getAdminUsers } from "@/modules/admin/queries";
import { UserActions } from "./UserActions";
import Link from "next/link";

export const metadata = { title: "User Management" };

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: { page?: string; status?: string; search?: string };
}) {
  const page = Number(searchParams.page) || 1;
  const { users, total, totalPages } = await getAdminUsers({
    page,
    status: searchParams.status as never,
    search: searchParams.search,
  });

  return (
    <div>
      <h2 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100 mb-6">
        User Management
      </h2>

      <div className="flex gap-2 mb-4 flex-wrap">
        {["ALL", "ACTIVE", "SUSPENDED"].map((s) => {
          const isActive = (searchParams.status ?? "ALL") === s;
          const href = s === "ALL" ? "/admin/users" : `/admin/users?status=${s}`;
          return (
            <Link
              key={s}
              href={href as never}
              className={`px-3 py-1.5 text-sm rounded-full border ${
                isActive
                  ? "bg-primary-6000 text-white border-primary-6000"
                  : "border-neutral-300 dark:border-neutral-600 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700"
              }`}
            >
              {s}
            </Link>
          );
        })}
      </div>

      <div className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 dark:border-neutral-700 text-left">
              <th className="px-4 py-3 font-medium text-neutral-500 dark:text-neutral-400">User</th>
              <th className="px-4 py-3 font-medium text-neutral-500 dark:text-neutral-400">Roles</th>
              <th className="px-4 py-3 font-medium text-neutral-500 dark:text-neutral-400">Status</th>
              <th className="px-4 py-3 font-medium text-neutral-500 dark:text-neutral-400">Verified</th>
              <th className="px-4 py-3 font-medium text-neutral-500 dark:text-neutral-400">Listings</th>
              <th className="px-4 py-3 font-medium text-neutral-500 dark:text-neutral-400">Bookings</th>
              <th className="px-4 py-3 font-medium text-neutral-500 dark:text-neutral-400">Joined</th>
              <th className="px-4 py-3 font-medium text-neutral-500 dark:text-neutral-400">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700">
            {users.map((user) => (
              <tr key={user.id}>
                <td className="px-4 py-3">
                  <div className="font-medium text-neutral-900 dark:text-neutral-100">
                    {user.firstName} {user.lastName}
                  </div>
                  <div className="text-neutral-500 dark:text-neutral-400 text-xs">
                    {user.email}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1 flex-wrap">
                    {user.roles.map((r) => (
                      <span
                        key={r}
                        className="px-1.5 py-0.5 text-xs rounded bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300"
                      >
                        {r}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`px-2 py-0.5 text-xs rounded-full ${
                      user.status === "ACTIVE"
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : user.status === "SUSPENDED"
                          ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                          : "bg-neutral-100 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300"
                    }`}
                  >
                    {user.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-neutral-600 dark:text-neutral-300">
                  {user.isVerified ? "Yes" : "No"}
                </td>
                <td className="px-4 py-3 text-neutral-600 dark:text-neutral-300">
                  {user._count.listings}
                </td>
                <td className="px-4 py-3 text-neutral-600 dark:text-neutral-300">
                  {user._count.bookingsAsGuest}
                </td>
                <td className="px-4 py-3 text-neutral-500 dark:text-neutral-400 text-xs">
                  {new Date(user.createdAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-3">
                  <UserActions
                    userId={user.id}
                    status={user.status}
                    isVerified={user.isVerified}
                  />
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-neutral-500 dark:text-neutral-400">
                  No users found
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
              href={`/admin/users?page=${p}${searchParams.status ? `&status=${searchParams.status}` : ""}` as never}
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

      <p className="mt-2 text-xs text-neutral-400 text-center">{total} total users</p>
    </div>
  );
}
