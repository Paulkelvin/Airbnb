import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

const authState: { current: { id: string; roles: string[] } } = {
  current: { id: "ee000000-0000-4000-a000-000000000001", roles: ["CUSTOMER"] },
};
vi.mock("@/lib/auth", () => ({
  requireAuth: vi.fn(() => Promise.resolve(authState.current)),
}));
vi.mock("@/lib/notifications", () => ({
  getEmailProvider: () => ({ send: vi.fn().mockResolvedValue({ success: true }) }),
}));

import { changePassword } from "../auth";

const USER_ID = "ee000000-0000-4000-a000-000000000001";
const ORIGINAL_PASSWORD = "correct-horse-battery-staple";

beforeAll(async () => {
  const passwordHash = await bcrypt.hash(ORIGINAL_PASSWORD, 12);
  await prisma.user.upsert({
    where: { id: USER_ID },
    create: { id: USER_ID, email: "change-password-test@example.com", firstName: "Change", lastName: "Test", roles: ["CUSTOMER"], passwordHash },
    update: { passwordHash },
  });
});

afterAll(async () => {
  await prisma.notification.deleteMany({ where: { userId: USER_ID } });
  await prisma.user.deleteMany({ where: { id: USER_ID } });
});

function formData(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) fd.set(key, value);
  return fd;
}

describe("changePassword", () => {
  it("rejects when the current password is wrong", async () => {
    const result = await changePassword(
      formData({ currentPassword: "wrong-password", password: "New-password-123", confirmPassword: "New-password-123" }),
    );
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe("INVALID_CREDENTIALS");
  });

  it("rejects when the new password and confirmation don't match", async () => {
    const result = await changePassword(
      formData({ currentPassword: ORIGINAL_PASSWORD, password: "New-password-123", confirmPassword: "different-123" }),
    );
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe("VALIDATION_ERROR");
  });

  it("changes the password and notifies the user when the current password is correct", async () => {
    const result = await changePassword(
      formData({ currentPassword: ORIGINAL_PASSWORD, password: "New-password-123", confirmPassword: "New-password-123" }),
    );
    expect(result.success).toBe(true);

    const user = await prisma.user.findUnique({ where: { id: USER_ID } });
    const matches = await bcrypt.compare("New-password-123", user!.passwordHash!);
    expect(matches).toBe(true);

    const notification = await prisma.notification.findFirst({
      where: { userId: USER_ID, type: "PASSWORD_CHANGED", channel: "IN_APP" },
    });
    expect(notification).toBeTruthy();
  });
});
