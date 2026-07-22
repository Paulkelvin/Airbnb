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

function wrap(firstName: string, bodyHtml: string, _bodyText: string): string {
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head><meta http-equiv="Content-Type" content="text/html; charset=UTF-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;">
<tr><td align="center" style="padding:40px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
<!-- Header -->
<tr><td style="background-color:#18181b;padding:28px 32px;text-align:center;">
<span style="font-size:20px;font-weight:700;color:#ffffff;letter-spacing:0.5px;">Potomac Vista Cottage</span>
</td></tr>
<!-- Body -->
<tr><td style="padding:32px 32px 24px 32px;">
<p style="margin:0 0 20px 0;font-size:16px;line-height:1.5;color:#27272a;">Hi ${firstName},</p>
${bodyHtml}
</td></tr>
<!-- Footer -->
<tr><td style="padding:0 32px 32px 32px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr><td style="border-top:1px solid #e4e4e7;padding-top:20px;">
<p style="margin:0 0 4px 0;font-size:13px;color:#71717a;">Potomac Vista Cottage</p>
<p style="margin:0;font-size:12px;color:#a1a1aa;">Leonardtown, Maryland</p>
</td></tr>
</table>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

/**
 * Password-reset link email — not a `NotificationType` (it's a
 * security-sensitive one-time link, not something a user should see
 * re-listed in their in-app notification history), so it's rendered
 * directly by `forgotPassword()` rather than going through `notify()`/
 * `renderEmailTemplate()` above. Lives alongside the other email copy for
 * discoverability.
 */
export function renderPasswordResetEmail(resetUrl: string, firstName: string): RenderedEmail {
  const text = `We received a request to reset your password. Reset it here: ${resetUrl}\n\nThis link expires in 1 hour. If you didn't request this, you can safely ignore this email.`;
  const html = wrap(
    firstName,
    `<p style="margin:0 0 20px 0;font-size:16px;line-height:1.5;color:#27272a;">We received a request to reset your password.</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 20px 0;"><tr><td style="background-color:#18181b;border-radius:8px;text-align:center;">
<a href="${resetUrl}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">Reset Your Password</a>
</td></tr></table>
<p style="margin:0;font-size:13px;line-height:1.5;color:#71717a;">This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>`,
    text,
  );
  return { subject: "Reset your Potomac password", html, text };
}

/**
 * Booking login code email — like the password-reset link above, this is a
 * one-time security code rather than a NotificationType with in-app history,
 * so it's rendered directly by requestBookingOtp() rather than through
 * notify()/renderEmailTemplate().
 */
export function renderBookingOtpEmail(code: string, fullName: string): RenderedEmail {
  const firstName = fullName.trim().split(/\s+/)[0] || "there";
  const text = `Your booking confirmation code is ${code}. It expires in 10 minutes. If you didn't request this, you can safely ignore this email.`;
  const html = wrap(
    firstName,
    `<p style="margin:0 0 16px 0;font-size:16px;line-height:1.5;color:#27272a;">Your booking confirmation code is:</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px 0;"><tr><td style="background-color:#fafafa;border:1px solid #e4e4e7;border-radius:8px;padding:20px;text-align:center;">
<span style="font-size:32px;font-weight:700;letter-spacing:8px;color:#18181b;">${code}</span>
</td></tr></table>
<p style="margin:0;font-size:13px;line-height:1.5;color:#71717a;">This code expires in 10 minutes. If you didn't request this, you can safely ignore this email.</p>`,
    text,
  );
  return { subject: `${code} is your Potomac booking code`, html, text };
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
      const dates = p.checkInDate && p.checkOutDate
        ? `<tr><td style="padding:8px 0;font-size:14px;color:#71717a;width:100px;">Dates</td><td style="padding:8px 0;font-size:14px;color:#27272a;">${p.checkInDate} — ${p.checkOutDate}</td></tr>`
        : "";
      const html = wrap(firstName, `
<p style="margin:0 0 20px 0;font-size:16px;line-height:1.5;color:#27272a;">Your booking has been confirmed.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px 0;background-color:#fafafa;border:1px solid #e4e4e7;border-radius:8px;">
<tr><td style="padding:16px 20px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr><td style="padding:8px 0;font-size:14px;color:#71717a;width:100px;">Property</td><td style="padding:8px 0;font-size:14px;font-weight:600;color:#27272a;">${p.listingTitle}</td></tr>
${dates}
<tr><td style="padding:8px 0;font-size:14px;color:#71717a;width:100px;">Total</td><td style="padding:8px 0;font-size:14px;font-weight:600;color:#27272a;">${formatMoney(p.amount, p.currency)}</td></tr>
</table>
</td></tr></table>
<p style="margin:0;font-size:13px;line-height:1.5;color:#71717a;">We look forward to hosting you!</p>`, text);
      return { subject: `Booking confirmed — ${p.listingTitle}`, text, html };
    }
    case "BOOKING_CANCELLED": {
      const p = payload as NotificationPayloads["BOOKING_CANCELLED"];
      const text = `Your booking for "${p.listingTitle}" has been cancelled.${p.reason ? ` Reason: ${p.reason}` : ""}`;
      const html = wrap(firstName, `
<p style="margin:0 0 20px 0;font-size:16px;line-height:1.5;color:#27272a;">Your booking for <strong>${p.listingTitle}</strong> has been cancelled.</p>
${p.reason ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px 0;"><tr><td style="background-color:#fef2f2;border-left:3px solid #ef4444;border-radius:4px;padding:12px 16px;font-size:14px;color:#991b1b;">${p.reason}</td></tr></table>` : ""}
<p style="margin:0;font-size:13px;line-height:1.5;color:#71717a;">If you have any questions, please don't hesitate to reach out.</p>`, text);
      return { subject: `Booking cancelled — ${p.listingTitle}`, text, html };
    }
    case "NEW_MESSAGE": {
      const p = payload as NotificationPayloads["NEW_MESSAGE"];
      const text = `${p.senderName} sent you a message: "${p.preview}"`;
      const html = wrap(firstName, `
<p style="margin:0 0 16px 0;font-size:16px;line-height:1.5;color:#27272a;">You have a new message from <strong>${p.senderName}</strong>:</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px 0;"><tr><td style="background-color:#fafafa;border:1px solid #e4e4e7;border-radius:8px;padding:16px 20px;font-size:14px;line-height:1.6;color:#3f3f46;font-style:italic;">
"${p.preview}"
</td></tr></table>`, text);
      return { subject: `New message from ${p.senderName}`, text, html };
    }
    case "NEW_INQUIRY": {
      const p = payload as NotificationPayloads["NEW_INQUIRY"];
      const text = `${p.senderName} sent an inquiry about "${p.listingTitle}": "${p.message}"`;
      const html = wrap(firstName, `
<p style="margin:0 0 16px 0;font-size:16px;line-height:1.5;color:#27272a;"><strong>${p.senderName}</strong> sent an inquiry about <strong>${p.listingTitle}</strong>:</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px 0;"><tr><td style="background-color:#fafafa;border:1px solid #e4e4e7;border-radius:8px;padding:16px 20px;font-size:14px;line-height:1.6;color:#3f3f46;font-style:italic;">
"${p.message}"
</td></tr></table>`, text);
      return { subject: `New inquiry — ${p.listingTitle}`, text, html };
    }
    case "REVIEW_RECEIVED": {
      const p = payload as NotificationPayloads["REVIEW_RECEIVED"];
      const text = `You received a ${p.rating}-star review for "${p.listingTitle}".`;
      const stars = "★".repeat(p.rating) + "☆".repeat(5 - p.rating);
      const html = wrap(firstName, `
<p style="margin:0 0 16px 0;font-size:16px;line-height:1.5;color:#27272a;">You received a new review for <strong>${p.listingTitle}</strong>.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px 0;"><tr><td style="background-color:#fafafa;border:1px solid #e4e4e7;border-radius:8px;padding:20px;text-align:center;">
<span style="font-size:24px;color:#f59e0b;letter-spacing:2px;">${stars}</span>
<p style="margin:8px 0 0 0;font-size:14px;color:#71717a;">${p.rating} out of 5 stars</p>
</td></tr></table>`, text);
      return { subject: `New ${p.rating}-star review — ${p.listingTitle}`, text, html };
    }
    case "PAYOUT_SENT": {
      const p = payload as NotificationPayloads["PAYOUT_SENT"];
      const text = `A payout of ${formatMoney(p.amount, p.currency)} has been sent to your account.`;
      const html = wrap(firstName, `
<p style="margin:0 0 20px 0;font-size:16px;line-height:1.5;color:#27272a;">A payout has been sent to your account.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px 0;"><tr><td style="background-color:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:20px;text-align:center;">
<span style="font-size:28px;font-weight:700;color:#166534;">${formatMoney(p.amount, p.currency)}</span>
<p style="margin:8px 0 0 0;font-size:13px;color:#71717a;">Sent to your linked account</p>
</td></tr></table>`, text);
      return { subject: `Payout sent: ${formatMoney(p.amount, p.currency)}`, text, html };
    }
    case "LISTING_APPROVED": {
      const p = payload as NotificationPayloads["LISTING_APPROVED"];
      const text = `Your listing "${p.listingTitle}" has been approved and is now live.`;
      const html = wrap(firstName, `
<p style="margin:0 0 20px 0;font-size:16px;line-height:1.5;color:#27272a;">Great news — your listing <strong>${p.listingTitle}</strong> has been approved and is now live!</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px 0;"><tr><td style="background-color:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px 20px;text-align:center;font-size:14px;color:#166534;font-weight:600;">
Listing is live
</td></tr></table>`, text);
      return { subject: `Listing approved — ${p.listingTitle}`, text, html };
    }
    case "LISTING_REJECTED": {
      const p = payload as NotificationPayloads["LISTING_REJECTED"];
      const text = `Your listing "${p.listingTitle}" was not approved.${p.reason ? ` Reason: ${p.reason}` : ""}`;
      const html = wrap(firstName, `
<p style="margin:0 0 20px 0;font-size:16px;line-height:1.5;color:#27272a;">Your listing <strong>${p.listingTitle}</strong> was not approved.</p>
${p.reason ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px 0;"><tr><td style="background-color:#fef2f2;border-left:3px solid #ef4444;border-radius:4px;padding:12px 16px;font-size:14px;color:#991b1b;">${p.reason}</td></tr></table>` : ""}
<p style="margin:0;font-size:13px;line-height:1.5;color:#71717a;">You can update your listing and resubmit for review.</p>`, text);
      return { subject: `Listing not approved — ${p.listingTitle}`, text, html };
    }
    case "RENT_DUE_REMINDER": {
      const p = payload as NotificationPayloads["RENT_DUE_REMINDER"];
      const text = `Rent of ${formatMoney(p.amount, p.currency)} for "${p.listingTitle}" is due on ${p.dueDate}.`;
      const html = wrap(firstName, `
<p style="margin:0 0 20px 0;font-size:16px;line-height:1.5;color:#27272a;">This is a reminder that your rent is due soon.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px 0;background-color:#fafafa;border:1px solid #e4e4e7;border-radius:8px;">
<tr><td style="padding:16px 20px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr><td style="padding:8px 0;font-size:14px;color:#71717a;width:100px;">Property</td><td style="padding:8px 0;font-size:14px;font-weight:600;color:#27272a;">${p.listingTitle}</td></tr>
<tr><td style="padding:8px 0;font-size:14px;color:#71717a;width:100px;">Amount</td><td style="padding:8px 0;font-size:14px;font-weight:600;color:#27272a;">${formatMoney(p.amount, p.currency)}</td></tr>
<tr><td style="padding:8px 0;font-size:14px;color:#71717a;width:100px;">Due date</td><td style="padding:8px 0;font-size:14px;font-weight:600;color:#27272a;">${p.dueDate}</td></tr>
</table>
</td></tr></table>`, text);
      return { subject: `Rent due soon — ${p.listingTitle}`, text, html };
    }
    case "PASSWORD_CHANGED": {
      const text = `Your password was changed. If this wasn't you, contact support immediately.`;
      const html = wrap(firstName, `
<p style="margin:0 0 20px 0;font-size:16px;line-height:1.5;color:#27272a;">Your password was successfully changed.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px 0;"><tr><td style="background-color:#fffbeb;border-left:3px solid #f59e0b;border-radius:4px;padding:12px 16px;font-size:14px;color:#92400e;">
If you didn't make this change, please contact support immediately.
</td></tr></table>`, text);
      return { subject: `Your password was changed`, text, html };
    }
    case "PAYMENT_FAILED": {
      const p = payload as NotificationPayloads["PAYMENT_FAILED"];
      const text = `A payment of ${formatMoney(p.amount, p.currency)} failed.${p.failureReason ? ` Reason: ${p.failureReason}` : ""}`;
      const html = wrap(firstName, `
<p style="margin:0 0 20px 0;font-size:16px;line-height:1.5;color:#27272a;">A payment of <strong>${formatMoney(p.amount, p.currency)}</strong> could not be processed.</p>
${p.failureReason ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px 0;"><tr><td style="background-color:#fef2f2;border-left:3px solid #ef4444;border-radius:4px;padding:12px 16px;font-size:14px;color:#991b1b;">${p.failureReason}</td></tr></table>` : ""}
<p style="margin:0;font-size:13px;line-height:1.5;color:#71717a;">Please update your payment method and try again.</p>`, text);
      return { subject: `Payment failed`, text, html };
    }
    default: {
      const _exhaustive: never = type;
      throw new Error(`No email template for notification type ${_exhaustive}`);
    }
  }
}
