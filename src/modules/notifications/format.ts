import type { NotificationType } from "@prisma/client";

export const TYPE_LABELS: Record<NotificationType, string> = {
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

export function summarizeNotification(
  type: NotificationType,
  payload: Record<string, unknown>,
): string {
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
