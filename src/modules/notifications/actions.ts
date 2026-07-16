"use server";

import type { NotificationType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { TOGGLEABLE_TYPES } from "./queries";

type ActionResult<T> = { success: true; data: T } | { success: false; error: { code: string; message: string } };

export async function markNotificationRead(id: string): Promise<ActionResult<null>> {
  const user = await requireAuth();
  await prisma.notification.updateMany({
    where: { id, userId: user.id, channel: "IN_APP", readAt: null },
    data: { readAt: new Date() },
  });
  revalidatePath("/account-notifications");
  return { success: true, data: null };
}

export async function markAllNotificationsRead(): Promise<ActionResult<null>> {
  const user = await requireAuth();
  await prisma.notification.updateMany({
    where: { userId: user.id, channel: "IN_APP", readAt: null },
    data: { readAt: new Date() },
  });
  revalidatePath("/account-notifications");
  return { success: true, data: null };
}

/** Only the toggleable (non-critical) types can be changed — critical types always email. */
export async function updateNotificationPreference(type: NotificationType, enabled: boolean): Promise<ActionResult<null>> {
  const user = await requireAuth();
  if (!TOGGLEABLE_TYPES.includes(type)) {
    return { success: false, error: { code: "NOT_TOGGLEABLE", message: "This notification type cannot be disabled" } };
  }

  await prisma.notificationPreference.upsert({
    where: { userId_type_channel: { userId: user.id, type, channel: "EMAIL" } },
    create: { userId: user.id, type, channel: "EMAIL", enabled },
    update: { enabled },
  });
  revalidatePath("/account-notifications");
  return { success: true, data: null };
}
