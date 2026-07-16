import type { NotificationType } from "@prisma/client";

/**
 * Payload shape stored on each Notification row (JSON column) and passed to
 * the corresponding email template below. Keys match exactly one
 * NotificationType each — see notify()'s generic signature in
 * src/modules/notifications/notify.ts.
 */
export type NotificationPayloads = {
  BOOKING_CONFIRMED: {
    bookingId: string;
    listingTitle: string;
    checkInDate?: string;
    checkOutDate?: string;
    amount: number;
    currency: string;
  };
  BOOKING_CANCELLED: {
    bookingId: string;
    listingTitle: string;
    cancelledBy: "GUEST" | "HOST" | "ADMIN" | "SYSTEM";
    reason?: string;
  };
  NEW_MESSAGE: {
    conversationId: string;
    senderName: string;
    preview: string;
  };
  NEW_INQUIRY: {
    inquiryId: string;
    listingTitle: string;
    senderName: string;
    message: string;
  };
  REVIEW_RECEIVED: {
    reviewId: string;
    bookingId: string;
    listingTitle: string;
    rating: number;
  };
  PAYOUT_SENT: {
    paymentId: string;
    bookingId: string;
    amount: number;
    currency: string;
  };
  LISTING_APPROVED: {
    listingId: string;
    listingTitle: string;
    listingSlug: string;
  };
  LISTING_REJECTED: {
    listingId: string;
    listingTitle: string;
    reason?: string;
  };
  RENT_DUE_REMINDER: {
    bookingId: string;
    listingTitle: string;
    amount: number;
    currency: string;
    dueDate: string;
  };
  PASSWORD_CHANGED: {
    changedAt: string;
  };
  PAYMENT_FAILED: {
    paymentId: string;
    bookingId: string;
    amount: number;
    currency: string;
    failureReason?: string;
  };
};

interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

function formatMoney(amountCents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amountCents / 100);
}

function wrap(firstName: string, bodyHtml: string, bodyText: string): RenderedEmail["html"] {
  return `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;"><p>Hi ${firstName},</p>${bodyHtml}<p style="color:#888;font-size:12px;">— Potomac</p></div>`;
}

export function renderEmailTemplate<T extends NotificationType>(
  type: T,
  payload: NotificationPayloads[T],
  firstName: string,
): RenderedEmail {
  switch (type) {
    case "BOOKING_CONFIRMED": {
      const p = payload as NotificationPayloads["BOOKING_CONFIRMED"];
      const text = `Your booking for "${p.listingTitle}" is confirmed. Total: ${formatMoney(p.amount, p.currency)}.`;
      return { subject: `Booking confirmed: ${p.listingTitle}`, text, html: wrap(firstName, `<p>${text}</p>`, text) };
    }
    case "BOOKING_CANCELLED": {
      const p = payload as NotificationPayloads["BOOKING_CANCELLED"];
      const text = `Your booking for "${p.listingTitle}" has been cancelled.${p.reason ? ` Reason: ${p.reason}` : ""}`;
      return { subject: `Booking cancelled: ${p.listingTitle}`, text, html: wrap(firstName, `<p>${text}</p>`, text) };
    }
    case "NEW_MESSAGE": {
      const p = payload as NotificationPayloads["NEW_MESSAGE"];
      const text = `${p.senderName} sent you a message: "${p.preview}"`;
      return { subject: `New message from ${p.senderName}`, text, html: wrap(firstName, `<p>${text}</p>`, text) };
    }
    case "NEW_INQUIRY": {
      const p = payload as NotificationPayloads["NEW_INQUIRY"];
      const text = `${p.senderName} sent an inquiry about "${p.listingTitle}": "${p.message}"`;
      return { subject: `New inquiry: ${p.listingTitle}`, text, html: wrap(firstName, `<p>${text}</p>`, text) };
    }
    case "REVIEW_RECEIVED": {
      const p = payload as NotificationPayloads["REVIEW_RECEIVED"];
      const text = `You received a ${p.rating}-star review for "${p.listingTitle}".`;
      return { subject: `New review: ${p.listingTitle}`, text, html: wrap(firstName, `<p>${text}</p>`, text) };
    }
    case "PAYOUT_SENT": {
      const p = payload as NotificationPayloads["PAYOUT_SENT"];
      const text = `A payout of ${formatMoney(p.amount, p.currency)} has been sent to your account.`;
      return { subject: `Payout sent: ${formatMoney(p.amount, p.currency)}`, text, html: wrap(firstName, `<p>${text}</p>`, text) };
    }
    case "LISTING_APPROVED": {
      const p = payload as NotificationPayloads["LISTING_APPROVED"];
      const text = `Your listing "${p.listingTitle}" has been approved and is now live.`;
      return { subject: `Listing approved: ${p.listingTitle}`, text, html: wrap(firstName, `<p>${text}</p>`, text) };
    }
    case "LISTING_REJECTED": {
      const p = payload as NotificationPayloads["LISTING_REJECTED"];
      const text = `Your listing "${p.listingTitle}" was not approved.${p.reason ? ` Reason: ${p.reason}` : ""}`;
      return { subject: `Listing not approved: ${p.listingTitle}`, text, html: wrap(firstName, `<p>${text}</p>`, text) };
    }
    case "RENT_DUE_REMINDER": {
      const p = payload as NotificationPayloads["RENT_DUE_REMINDER"];
      const text = `Rent of ${formatMoney(p.amount, p.currency)} for "${p.listingTitle}" is due on ${p.dueDate}.`;
      return { subject: `Rent due soon: ${p.listingTitle}`, text, html: wrap(firstName, `<p>${text}</p>`, text) };
    }
    case "PASSWORD_CHANGED": {
      const text = `Your password was changed. If this wasn't you, contact support immediately.`;
      return { subject: `Your password was changed`, text, html: wrap(firstName, `<p>${text}</p>`, text) };
    }
    case "PAYMENT_FAILED": {
      const p = payload as NotificationPayloads["PAYMENT_FAILED"];
      const text = `A payment of ${formatMoney(p.amount, p.currency)} failed.${p.failureReason ? ` Reason: ${p.failureReason}` : ""}`;
      return { subject: `Payment failed`, text, html: wrap(firstName, `<p>${text}</p>`, text) };
    }
    default: {
      const _exhaustive: never = type;
      throw new Error(`No email template for notification type ${_exhaustive}`);
    }
  }
}
