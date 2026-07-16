import { Resend } from "resend";
import type { EmailProvider } from "./provider";
import { StubEmailProvider } from "./stub-provider";
import { ResendEmailProvider } from "./resend-provider";

export type { EmailProvider, SendEmailInput, SendEmailResult } from "./provider";

let cachedProvider: EmailProvider | null = null;

/**
 * The single place call sites obtain an EmailProvider — mirrors
 * src/lib/payments/index.ts's getPaymentProvider() pattern (ADR-006).
 *
 * Feature-flagged via `NOTIFICATIONS_PROVIDER` (defaults to "stub" so the
 * app runs fully offline with no email credentials at all): set it to
 * "resend" plus `RESEND_API_KEY`/`RESEND_FROM_EMAIL` once real credentials
 * exist, and every notify() call starts sending real email with no other
 * code change.
 */
export function getEmailProvider(): EmailProvider {
  if (cachedProvider) return cachedProvider;

  const mode = process.env.NOTIFICATIONS_PROVIDER ?? "stub";

  if (mode === "resend") {
    const apiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL;
    if (!apiKey || !fromEmail) {
      throw new Error(
        'NOTIFICATIONS_PROVIDER=resend requires both RESEND_API_KEY and RESEND_FROM_EMAIL to be set.',
      );
    }
    cachedProvider = new ResendEmailProvider(new Resend(apiKey), fromEmail);
  } else if (mode === "stub") {
    cachedProvider = new StubEmailProvider();
  } else {
    throw new Error(`Unknown NOTIFICATIONS_PROVIDER "${mode}" — expected "stub" or "resend".`);
  }

  return cachedProvider;
}
