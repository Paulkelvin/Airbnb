import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getMyNotifications, getMyNotificationPreferences } from "@/modules/notifications/queries";
import NotificationsClient from "./NotificationsClient";

export const metadata = {
  title: "Notifications",
};

export default async function AccountNotifications() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const [notifications, preferences] = await Promise.all([
    getMyNotifications(),
    getMyNotificationPreferences(),
  ]);

  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <h1 className="text-3xl font-semibold">Notifications</h1>
      </div>
      <div className="w-14 border-b border-neutral-200 dark:border-neutral-700"></div>

      <NotificationsClient
        notifications={notifications.map((n) => ({
          id: n.id,
          type: n.type,
          payload: n.payload as Record<string, unknown>,
          readAt: n.readAt ? n.readAt.toISOString() : null,
          createdAt: n.createdAt.toISOString(),
        }))}
        preferences={preferences}
      />
    </div>
  );
}
