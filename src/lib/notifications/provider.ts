/**
 * Gateway-agnostic email delivery interface (mirrors ADR-006's
 * PaymentProvider pattern) — the notification emission primitive
 * (src/modules/notifications/notify.ts) calls only this interface, never
 * an email SDK directly. Keeps `modules/notifications` ignorant of which
 * transactional email vendor is behind it.
 */

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface SendEmailResult {
  success: boolean;
  providerMessageId?: string;
  error?: string;
}

export interface EmailProvider {
  send(input: SendEmailInput): Promise<SendEmailResult>;
}
