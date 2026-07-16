import type { NotificationType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getEmailProvider } from "@/lib/notifications";
import { renderEmailTemplate, type NotificationPayloads } from "@/lib/notifications/templates";

/**
 * Notification types that always email regardless of user preference
 * (Platform Architecture Blueprint §7: "opt out of non-critical
 * notifications ... without losing critical ones (e.g. booking
 * confirmation)"). These four are the security- and transaction-integrity-
 * critical events named or implied by the blueprint's own example — every
 * other type defaults to opt-out (enabled unless the user disabled it).
 */
const CRITICAL_EMAIL_TYPES: ReadonlySet<NotificationType> = new Set<NotificationType>([
  "BOOKING_CONFIRMED",
  "BOOKING_CANCELLED",
  "PAYMENT_FAILED",
  "PASSWORD_CHANGED",
]);

/**
 * The notification emission primitive (Platform Architecture Blueprint
 * §7). Every domain action that should notify a user calls this — it is
 * the only writer of Notification rows in the codebase.
 *
 * Dispatch model per the blueprint's MVP guidance: the in-app row (channel
 * IN_APP) is always written and is what powers the unread badge — never
 * gated by preference ("always on"). The email row/send is gated by
 * NotificationPreference (default enabled — opt-out, not opt-in) unless
 * the type is in CRITICAL_EMAIL_TYPES. A slow or failing email provider
 * must never block or fail the caller's own transaction/action, so the
 * send is awaited but wrapped in try/catch — a delivery failure is logged,
 * not thrown. (No DB-backed job queue exists yet for email, same
 * "not yet triggered" status as ADR-023's Redis graduation path — this is
 * an accepted MVP tradeoff, not an oversight.)
 */
export async function notify<T extends NotificationType>(
  userId: string,
  type: T,
  payload: NotificationPayloads[T],
): Promise<void> {
  const jsonPayload = payload as unknown as Prisma.InputJsonValue;

  await prisma.notification.create({
    data: { userId, type, channel: "IN_APP", payload: jsonPayload },
  });

  let emailEnabled = CRITICAL_EMAIL_TYPES.has(type);
  if (!emailEnabled) {
    const pref = await prisma.notificationPreference.findUnique({
      where: { userId_type_channel: { userId, type, channel: "EMAIL" } },
    });
    emailEnabled = pref?.enabled ?? true;
  }
  if (!emailEnabled) return;

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, firstName: true } });
  if (!user) return;

  await prisma.notification.create({
    data: { userId, type, channel: "EMAIL", payload: jsonPayload },
  });

  try {
    const { subject, html, text } = renderEmailTemplate(type, payload, user.firstName);
    const provider = getEmailProvider();
    const result = await provider.send({ to: user.email, subject, html, text });
    if (!result.success) {
      console.error(`[notifications] Email send failed for ${type} to user ${userId}: ${result.error}`);
    }
  } catch (err) {
    console.error(`[notifications] Email send threw for ${type} to user ${userId}:`, err);
  }
}
