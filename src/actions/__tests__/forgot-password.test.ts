import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

const sendMock = vi.fn().mockResolvedValue({ success: true });
vi.mock("@/lib/notifications", () => ({
  getEmailProvider: () => ({ send: sendMock }),
}));
// `next/headers`'s `headers()` needs a real request context Vitest doesn't
// provide (same category as the auth gate / `next/cache` mocks used
// elsewhere in this project's tests) — forgotPassword() calls it via
// clientIp() for the IP-keyed rate limiter.
vi.mock("next/headers", () => ({
  headers: () => new Map<string, string>(),
}));

import { forgotPassword, resetPassword } from "../auth";

const USER_ID = "ee000000-0000-4000-a000-000000000002";
const USER_EMAIL = "forgot-password-test@example.com";

function formData(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) fd.set(key, value);
  return fd;
}

beforeAll(async () => {
  await prisma.user.upsert({
    where: { id: USER_ID },
    create: { id: USER_ID, email: USER_EMAIL, firstName: "Forgot", lastName: "Test", roles: ["CUSTOMER"] },
    update: {},
  });
});

afterAll(async () => {
  await prisma.rateLimitHit.deleteMany({ where: { key: { startsWith: "forgot-password:" } } });
  await prisma.notification.deleteMany({ where: { userId: USER_ID } });
  await prisma.user.deleteMany({ where: { id: USER_ID } });
});

describe("forgotPassword", () => {
  it("sends a real reset email and stores a hashed token for a known email", async () => {
    sendMock.mockClear();
    const result = await forgotPassword(formData({ email: USER_EMAIL }));
    expect(result.success).toBe(true);

    expect(sendMock).toHaveBeenCalledTimes(1);
    const call = sendMock.mock.calls[0][0];
    expect(call.to).toBe(USER_EMAIL);
    expect(call.html).toContain("/reset-password?token=");

    const user = await prisma.user.findUnique({ where: { id: USER_ID } });
    expect(user!.passwordResetToken).toBeTruthy();
    expect(user!.passwordResetExpiresAt).toBeTruthy();
  });

  it("returns the same success message for an unknown email and sends no email", async () => {
    sendMock.mockClear();
    const result = await forgotPassword(formData({ email: "no-such-user@example.com" }));
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.message).toBe("If an account exists with that email, a reset link has been sent");
    }
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("rate-limits repeated attempts from the same source", async () => {
    // Rate limit key is IP-based (`x-forwarded-for` unset in a test env resolves to "unknown"),
    // and shared across every call in this file, so this test exhausts whatever budget remains.
    let result: Awaited<ReturnType<typeof forgotPassword>> | undefined;
    for (let i = 0; i < 10; i++) {
      result = await forgotPassword(formData({ email: USER_EMAIL }));
      if (!result.success) break;
    }
    expect(result!.success).toBe(false);
    if (!result!.success) expect(result!.error.code).toBe("RATE_LIMITED");
  });
});

describe("resetPassword", () => {
  it("rejects an invalid token", async () => {
    const result = await resetPassword(
      formData({ token: "not-a-real-token", password: "New-password-123", confirmPassword: "New-password-123" }),
    );
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe("INVALID_TOKEN");
  });

  it("completes the full forgot -> email -> reset round trip with the real emailed token", async () => {
    // Isolated from the rate-limit-exhaustion test above.
    await prisma.rateLimitHit.deleteMany({ where: { key: { startsWith: "forgot-password:" } } });
    sendMock.mockClear();

    const forgotResult = await forgotPassword(formData({ email: USER_EMAIL }));
    expect(forgotResult.success).toBe(true);

    const call = sendMock.mock.calls[0][0];
    const token = new URL(call.html.match(/href="([^"]+)"/)[1]).searchParams.get("token");
    expect(token).toBeTruthy();

    const resetResult = await resetPassword(
      formData({ token: token!, password: "Round-trip-pass-123", confirmPassword: "Round-trip-pass-123" }),
    );
    expect(resetResult.success).toBe(true);

    const user = await prisma.user.findUnique({ where: { id: USER_ID } });
    expect(user!.passwordResetToken).toBeNull();
    expect(user!.passwordResetExpiresAt).toBeNull();
    expect(await bcrypt.compare("Round-trip-pass-123", user!.passwordHash!)).toBe(true);

    // The same token must not be usable a second time.
    const replay = await resetPassword(
      formData({ token: token!, password: "Another-pass-123", confirmPassword: "Another-pass-123" }),
    );
    expect(replay.success).toBe(false);
  });
});
