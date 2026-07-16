import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";
import { prisma } from "@/lib/db";
import { notify } from "../notify";

/**
 * Integration test against the real (local Postgres) database — exercises
 * notify()'s actual dispatch logic (always-on IN_APP row, preference-gated
 * EMAIL row, critical-type override) end-to-end. Only the EmailProvider is
 * mocked, since real delivery is covered separately by
 * src/lib/notifications/__tests__/resend-provider.test.ts.
 */

const sendMock = vi.fn().mockResolvedValue({ success: true, providerMessageId: "stub_1" });
vi.mock("@/lib/notifications", () => ({
  getEmailProvider: () => ({ send: sendMock }),
}));

const USER_ID = "bb000000-0000-4000-a000-000000000001";

beforeAll(async () => {
  await prisma.user.upsert({
    where: { id: USER_ID },
    create: { id: USER_ID, email: "notify-test@example.com", firstName: "Notify", lastName: "Test", roles: ["CUSTOMER"] },
    update: {},
  });
});

afterAll(async () => {
  await prisma.notification.deleteMany({ where: { userId: USER_ID } });
  await prisma.notificationPreference.deleteMany({ where: { userId: USER_ID } });
  await prisma.user.deleteMany({ where: { id: USER_ID } });
});

beforeEach(async () => {
  sendMock.mockClear();
  await prisma.notification.deleteMany({ where: { userId: USER_ID } });
  await prisma.notificationPreference.deleteMany({ where: { userId: USER_ID } });
});

describe("notify", () => {
  it("always writes an IN_APP row for a non-critical type with no preference set", async () => {
    await notify(USER_ID, "NEW_MESSAGE", { conversationId: "c1", senderName: "Alex", preview: "hey" });

    const rows = await prisma.notification.findMany({ where: { userId: USER_ID } });
    const inApp = rows.find((r) => r.channel === "IN_APP");
    expect(inApp).toBeTruthy();
    expect(inApp!.readAt).toBeNull();
  });

  it("defaults to emailing a non-critical type when no preference row exists (opt-out model)", async () => {
    await notify(USER_ID, "NEW_MESSAGE", { conversationId: "c1", senderName: "Alex", preview: "hey" });

    const emailRow = await prisma.notification.findFirst({ where: { userId: USER_ID, channel: "EMAIL" } });
    expect(emailRow).toBeTruthy();
    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(sendMock).toHaveBeenCalledWith(expect.objectContaining({ to: "notify-test@example.com" }));
  });

  it("skips the email when the user has disabled that non-critical type", async () => {
    await prisma.notificationPreference.create({
      data: { userId: USER_ID, type: "NEW_MESSAGE", channel: "EMAIL", enabled: false },
    });

    await notify(USER_ID, "NEW_MESSAGE", { conversationId: "c1", senderName: "Alex", preview: "hey" });

    const emailRow = await prisma.notification.findFirst({ where: { userId: USER_ID, channel: "EMAIL" } });
    expect(emailRow).toBeNull();
    expect(sendMock).not.toHaveBeenCalled();

    const inAppRow = await prisma.notification.findFirst({ where: { userId: USER_ID, channel: "IN_APP" } });
    expect(inAppRow).toBeTruthy();
  });

  it("always emails a critical type even when the user disabled it", async () => {
    await prisma.notificationPreference.create({
      data: { userId: USER_ID, type: "BOOKING_CONFIRMED", channel: "EMAIL", enabled: false },
    });

    await notify(USER_ID, "BOOKING_CONFIRMED", {
      bookingId: "b1",
      listingTitle: "Test Villa",
      amount: 10000,
      currency: "USD",
    });

    const emailRow = await prisma.notification.findFirst({ where: { userId: USER_ID, channel: "EMAIL" } });
    expect(emailRow).toBeTruthy();
    expect(sendMock).toHaveBeenCalledTimes(1);
  });

  it("does not throw when the email provider throws", async () => {
    sendMock.mockRejectedValueOnce(new Error("network down"));

    await expect(
      notify(USER_ID, "NEW_INQUIRY", { inquiryId: "i1", listingTitle: "Test Villa", senderName: "Alex", message: "hi" }),
    ).resolves.toBeUndefined();

    const inAppRow = await prisma.notification.findFirst({ where: { userId: USER_ID, channel: "IN_APP" } });
    expect(inAppRow).toBeTruthy();
  });
});
