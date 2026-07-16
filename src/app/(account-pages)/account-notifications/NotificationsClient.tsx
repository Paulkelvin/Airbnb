"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import ButtonSecondary from "@/components/ui/ButtonSecondary";
import { markNotificationRead, markAllNotificationsRead, updateNotificationPreference } from "@/modules/notifications/actions";

type NotificationType =
  | "BOOKING_CONFIRMED"
  | "BOOKING_CANCELLED"
  | "NEW_MESSAGE"
  | "NEW_INQUIRY"
  | "REVIEW_RECEIVED"
  | "PAYOUT_SENT"
  | "LISTING_APPROVED"
  | "LISTING_REJECTED"
  | "RENT_DUE_REMINDER"
  | "PASSWORD_CHANGED"
  | "PAYMENT_FAILED";

interface NotificationItem {
  id: string;
  type: NotificationType;
  payload: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
}

interface PreferenceItem {
  type: NotificationType;
  emailEnabled: boolean;
}

const TYPE_LABELS: Record<NotificationType, string> = {
  BOOKING_CONFIRMED: "Booking confirmed",
  BOOKING_CANCELLED: "Booking cancelled",
  NEW_MESSAGE: "New message",
  NEW_INQUIRY: "New inquiry",
  REVIEW_RECEIVED: "New review",
  PAYOUT_SENT: "Payout sent",
  LISTING_APPROVED: "Listing approved",
  LISTING_REJECTED: "Listing not approved",
  RENT_DUE_REMINDER: "Rent due soon",
  PASSWORD_CHANGED: "Password changed",
  PAYMENT_FAILED: "Payment failed",
};

function summarize(type: NotificationType, payload: Record<string, unknown>): string {
  switch (type) {
    case "BOOKING_CONFIRMED":
    case "BOOKING_CANCELLED":
      return String(payload.listingTitle ?? "");
    case "NEW_MESSAGE":
      return `${payload.senderName}: "${payload.preview}"`;
    case "NEW_INQUIRY":
      return `${payload.senderName} asked about "${payload.listingTitle}"`;
    case "REVIEW_RECEIVED":
      return `${payload.rating}-star review for "${payload.listingTitle}"`;
    case "PAYOUT_SENT":
      return `${((payload.amount as number) / 100).toFixed(2)} ${payload.currency}`;
    case "LISTING_APPROVED":
    case "LISTING_REJECTED":
      return String(payload.listingTitle ?? "");
    case "RENT_DUE_REMINDER":
      return `${payload.listingTitle} — due ${payload.dueDate}`;
    case "PASSWORD_CHANGED":
      return "Your password was changed";
    case "PAYMENT_FAILED":
      return String(payload.failureReason ?? "A payment could not be processed");
    default:
      return "";
  }
}

export default function NotificationsClient({
  notifications,
  preferences,
}: {
  notifications: NotificationItem[];
  preferences: PreferenceItem[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [localReadIds, setLocalReadIds] = useState<Set<string>>(new Set());

  function handleMarkRead(id: string) {
    setLocalReadIds((prev) => new Set(prev).add(id));
    startTransition(async () => {
      await markNotificationRead(id);
      router.refresh();
    });
  }

  function handleMarkAllRead() {
    startTransition(async () => {
      await markAllNotificationsRead();
      router.refresh();
    });
  }

  function handleTogglePreference(type: NotificationType, enabled: boolean) {
    startTransition(async () => {
      await updateNotificationPreference(type, enabled);
      router.refresh();
    });
  }

  const hasUnread = notifications.some((n) => !n.readAt && !localReadIds.has(n.id));

  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Recent activity</h3>
          {hasUnread && (
            <ButtonSecondary sizeClass="px-4 py-2" fontSize="text-sm" onClick={handleMarkAllRead} disabled={isPending}>
              Mark all as read
            </ButtonSecondary>
          )}
        </div>

        {notifications.length === 0 ? (
          <p className="text-neutral-500">No notifications yet.</p>
        ) : (
          <ul className="divide-y divide-neutral-200 dark:divide-neutral-700">
            {notifications.map((n) => {
              const isUnread = !n.readAt && !localReadIds.has(n.id);
              return (
                <li
                  key={n.id}
                  className={`flex items-start justify-between gap-4 py-4 ${isUnread ? "bg-primary-50/50 dark:bg-neutral-800/50" : ""}`}
                >
                  <div>
                    <p className="text-sm font-medium">{TYPE_LABELS[n.type]}</p>
                    <p className="text-sm text-neutral-500">{summarize(n.type, n.payload)}</p>
                    <p className="text-xs text-neutral-400 mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                  </div>
                  {isUnread && (
                    <button
                      className="text-xs text-primary-600 hover:underline flex-shrink-0"
                      onClick={() => handleMarkRead(n.id)}
                      disabled={isPending}
                    >
                      Mark read
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="space-y-4">
        <h3 className="text-lg font-semibold">Email preferences</h3>
        <p className="text-sm text-neutral-500">
          Booking confirmations, cancellations, failed payments, and password changes are always emailed. Everything
          else below is optional.
        </p>
        <ul className="divide-y divide-neutral-200 dark:divide-neutral-700">
          {preferences.map((pref) => (
            <li key={pref.type} className="flex items-center justify-between py-3">
              <span className="text-sm">{TYPE_LABELS[pref.type]}</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={pref.emailEnabled}
                  disabled={isPending}
                  onChange={(e) => handleTogglePreference(pref.type, e.target.checked)}
                />
                <div className="w-11 h-6 bg-neutral-200 peer-checked:bg-primary-500 rounded-full peer dark:bg-neutral-700 transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-5" />
              </label>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
