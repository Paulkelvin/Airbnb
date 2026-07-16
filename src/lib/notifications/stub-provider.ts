import type { EmailProvider, SendEmailInput, SendEmailResult } from "./provider";

/**
 * NOT FOR PRODUCTION. Deterministic fake EmailProvider that never calls a
 * real vendor — logs to the console and always succeeds, so the whole
 * notification pipeline (notify() writes, preference gating, retrofit call
 * sites) can be built and tested end-to-end before real Resend credentials
 * exist. Selected automatically by src/lib/notifications/index.ts whenever
 * NOTIFICATIONS_PROVIDER isn't explicitly set to "resend".
 */
export class StubEmailProvider implements EmailProvider {
  async send(input: SendEmailInput): Promise<SendEmailResult> {
    console.log(`[stub-email] to=${input.to} subject="${input.subject}"`);
    return { success: true, providerMessageId: `stub_email_${Date.now()}` };
  }
}
