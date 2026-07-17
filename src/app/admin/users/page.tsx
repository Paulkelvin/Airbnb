import { getAdminUsers } from "@/modules/admin/queries";
import { getCurrentUser } from "@/lib/auth";
import { UserActions } from "./UserActions";
import {
  AdminPageHeader,
  AdminFilterPills,
  AdminTableCard,
  AdminBadge,
  AdminPagination,
  userStatusTone,
} from "../AdminUI";

export const metadata = { title: "User Management" };

const STATUSES = ["ALL", "ACTIVE", "SUSPENDED"] as const;

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: { page?: string; status?: string; search?: string };
}) {
  const page = Number(searchParams.page) || 1;
  const [{ users, total, totalPages }, currentUser] = await Promise.all([
    getAdminUsers({
      page,
      status: searchParams.status as never,
      search: searchParams.search,
    }),
    getCurrentUser(),
  ]);

  return (
    <div>
      <AdminPageHeader title="User Management" description={`${total} total users`} />

      <AdminFilterPills
        options={STATUSES}
        activeValue={searchParams.status ?? "ALL"}
        basePath="/admin/users"
      />

      <AdminTableCard>
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
                  <AdminBadge tone={userStatusTone(user.status)}>{user.status}</AdminBadge>
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
                    roles={user.roles}
                    isSelf={user.id === currentUser?.id}
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
      </AdminTableCard>

      <AdminPagination
        page={page}
        totalPages={totalPages}
        basePath="/admin/users"
        extraParams={searchParams.status ? `&status=${searchParams.status}` : ""}
      />
    </div>
  );
}
