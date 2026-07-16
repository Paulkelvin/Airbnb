import { describe, it, expect, vi } from "vitest";
import type { Resend } from "resend";
import { ResendEmailProvider } from "../resend-provider";

/**
 * Exercises ResendEmailProvider entirely against a mocked Resend client
 * (dependency injection) — no network access, no real credentials. Mirrors
 * src/lib/payments/__tests__/stripe-provider.test.ts's DI pattern.
 */

function mockResend(overrides: Record<string, unknown> = {}): Resend {
  return {
    emails: { send: vi.fn() },
    ...overrides,
  } as unknown as Resend;
}

describe("ResendEmailProvider.send", () => {
  it("returns success and the provider message id on a successful send", async () => {
    const client = mockResend({ emails: { send: vi.fn().mockResolvedValue({ data: { id: "email_123" }, error: null }) } });
    const provider = new ResendEmailProvider(client, "noreply@potomac.com");

    const result = await provider.send({ to: "guest@example.com", subject: "Hi", html: "<p>Hi</p>", text: "Hi" });

    expect(result).toEqual({ success: true, providerMessageId: "email_123" });
    expect(client.emails.send).toHaveBeenCalledWith({
      from: "noreply@potomac.com",
      to: "guest@example.com",
      subject: "Hi",
      html: "<p>Hi</p>",
      text: "Hi",
    });
  });

  it("returns failure with the error message when Resend reports an error", async () => {
    const client = mockResend({
      emails: { send: vi.fn().mockResolvedValue({ data: null, error: { message: "Invalid from address" } }) },
    });
    const provider = new ResendEmailProvider(client, "noreply@potomac.com");

    const result = await provider.send({ to: "guest@example.com", subject: "Hi", html: "<p>Hi</p>", text: "Hi" });

    expect(result).toEqual({ success: false, error: "Invalid from address" });
  });
});
