import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getMyNotifications, getUnreadNotificationCount } from "@/modules/notifications/queries";

/** Powers the header bell dropdown — a lightweight client-side fetch of the same feed shown on /account-notifications. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ notifications: [], unreadCount: 0 }, { status: 200 });
  }

  const [notifications, unreadCount] = await Promise.all([
    getMyNotifications(5),
    getUnreadNotificationCount(),
  ]);

  return NextResponse.json({
    notifications: notifications.map((n) => ({
      id: n.id,
      type: n.type,
      payload: n.payload as Record<string, unknown>,
      readAt: n.readAt ? n.readAt.toISOString() : null,
      createdAt: n.createdAt.toISOString(),
    })),
    unreadCount,
  });
}
