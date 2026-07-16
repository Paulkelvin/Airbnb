import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";
import { prisma } from "@/lib/db";

vi.mock("@/lib/auth", () => ({
  requireAuth: vi.fn().mockResolvedValue({ id: "bb000000-0000-4000-a000-000000000002", roles: ["CUSTOMER"] }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { markNotificationRead, markAllNotificationsRead, updateNotificationPreference } from "../actions";

const USER_ID = "bb000000-0000-4000-a000-000000000002";

beforeAll(async () => {
  await prisma.user.upsert({
    where: { id: USER_ID },
    create: { id: USER_ID, email: "notify-actions-test@example.com", firstName: "Notify", lastName: "Actions", roles: ["CUSTOMER"] },
    update: {},
  });
});

afterAll(async () => {
  await prisma.notification.deleteMany({ where: { userId: USER_ID } });
  await prisma.notificationPreference.deleteMany({ where: { userId: USER_ID } });
  await prisma.user.deleteMany({ where: { id: USER_ID } });
});

beforeEach(async () => {
  await prisma.notification.deleteMany({ where: { userId: USER_ID } });
  await prisma.notificationPreference.deleteMany({ where: { userId: USER_ID } });
});

describe("markNotificationRead", () => {
  it("marks only the caller's own unread IN_APP notification as read", async () => {
    const n = await prisma.notification.create({
      data: { userId: USER_ID, type: "NEW_MESSAGE", channel: "IN_APP", payload: {} },
    });

    await markNotificationRead(n.id);

    const updated = await prisma.notification.findUnique({ where: { id: n.id } });
    expect(updated!.readAt).toBeTruthy();
  });
});

describe("markAllNotificationsRead", () => {
  it("marks every unread IN_APP row for the caller", async () => {
    await prisma.notification.createMany({
      data: [
        { userId: USER_ID, type: "NEW_MESSAGE", channel: "IN_APP", payload: {} },
        { userId: USER_ID, type: "NEW_INQUIRY", channel: "IN_APP", payload: {} },
      ],
    });

    await markAllNotificationsRead();

    const remaining = await prisma.notification.count({ where: { userId: USER_ID, channel: "IN_APP", readAt: null } });
    expect(remaining).toBe(0);
  });
});

describe("updateNotificationPreference", () => {
  it("upserts an email preference for a toggleable type", async () => {
    const result = await updateNotificationPreference("NEW_MESSAGE", false);
    expect(result).toEqual({ success: true, data: null });

    const pref = await prisma.notificationPreference.findUnique({
      where: { userId_type_channel: { userId: USER_ID, type: "NEW_MESSAGE", channel: "EMAIL" } },
    });
    expect(pref!.enabled).toBe(false);
  });

  it("refuses to toggle a critical (always-on) type", async () => {
    const result = await updateNotificationPreference("BOOKING_CONFIRMED", false);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe("NOT_TOGGLEABLE");

    const pref = await prisma.notificationPreference.findUnique({
      where: { userId_type_channel: { userId: USER_ID, type: "BOOKING_CONFIRMED", channel: "EMAIL" } },
    });
    expect(pref).toBeNull();
  });
});
