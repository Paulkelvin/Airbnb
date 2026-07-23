import type { NotificationType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

const TOGGLEABLE_TYPES: NotificationType[] = [
  "NEW_MESSAGE",
  "NEW_INQUIRY",
  "REVIEW_RECEIVED",
  "PAYOUT_SENT",
  "LISTING_APPROVED",
  "LISTING_REJECTED",
  "RENT_DUE_REMINDER",
];

const HOST_ONLY_TYPES: NotificationType[] = [
  "NEW_INQUIRY",
  "PAYOUT_SENT",
  "LISTING_APPROVED",
  "LISTING_REJECTED",
];

/** In-app notification feed — channel IN_APP only; EMAIL rows are a delivery log, not shown here. */
export async function getMyNotifications(limit = 30) {
  const user = await requireAuth();
  return prisma.notification.findMany({
    where: { userId: user.id, channel: "IN_APP" },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function getUnreadNotificationCount(): Promise<number> {
  const user = await requireAuth();
  return prisma.notification.count({
    where: { userId: user.id, channel: "IN_APP", readAt: null },
  });
}

/**
 * The current user's email preference for each toggleable notification type
 * (BOOKING_CONFIRMED/BOOKING_CANCELLED/PAYMENT_FAILED/PASSWORD_CHANGED are
 * excluded — always-on critical types, see notify()'s CRITICAL_EMAIL_TYPES).
 * Defaults to enabled=true when no NotificationPreference row exists yet
 * (opt-out model — a user has never disabled anything until they explicitly do).
 */
export async function getMyNotificationPreferences() {
  const user = await requireAuth();
  const rows = await prisma.notificationPreference.findMany({
    where: { userId: user.id, channel: "EMAIL", type: { in: TOGGLEABLE_TYPES } },
    select: { type: true, enabled: true },
  });
  const overrides = new Map(rows.map((r) => [r.type, r.enabled]));
  return TOGGLEABLE_TYPES.map((type) => ({ type, emailEnabled: overrides.get(type) ?? true }));
}

export { TOGGLEABLE_TYPES, HOST_ONLY_TYPES };
