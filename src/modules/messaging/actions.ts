"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAuth, requireAdmin } from "@/lib/auth";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { sendMessageSchema, conversationIdSchema, type SendMessageInput, type ConversationIdInput } from "@/lib/validations/messaging";
import { isConversationParticipant, getConversationByIdUnchecked } from "./queries";
import type { ActionResult } from "@/lib/validations/auth";

/**
 * Sends a message into an existing thread (`conversationId`), or lazily
 * starts/resumes the one thread a booking owns (`bookingId`) — Domain
 * Model Spec §2.12: "Conversation created on first message ... from a
 * Booking context." Inquiry-anchored conversations are instead created
 * eagerly by createInquiry() (modules/inquiries/actions.ts), since an
 * inquiry's own text already *is* that thread's first message.
 */
export async function sendMessage(input: SendMessageInput): Promise<ActionResult<{ conversationId: string }>> {
  const user = await requireAuth();

  const rateLimit = await checkRateLimit(`message:${user.id}`, RATE_LIMITS.MESSAGE_SEND);
  if (!rateLimit.allowed) {
    return {
      success: false,
      error: {
        code: "RATE_LIMITED",
        message: `Too many messages sent. Please try again in ${rateLimit.retryAfterSeconds}s.`,
      },
    };
  }

  const parsed = sendMessageSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid message" } };
  }
  const data = parsed.data;

  let conversationId: string;

  if (data.conversationId) {
    const allowed = await isConversationParticipant(data.conversationId, user.id);
    if (!allowed) {
      return { success: false, error: { code: "FORBIDDEN", message: "You are not part of this conversation" } };
    }
    conversationId = data.conversationId;
  } else {
    const booking = await prisma.booking.findUnique({
      where: { id: data.bookingId },
      select: { id: true, listingId: true, guestId: true, hostId: true },
    });
    if (!booking) {
      return { success: false, error: { code: "NOT_FOUND", message: "Booking not found" } };
    }
    if (booking.guestId !== user.id && booking.hostId !== user.id) {
      return { success: false, error: { code: "FORBIDDEN", message: "You are not part of this booking" } };
    }

    const existing = await prisma.conversation.findUnique({
      where: { bookingId: booking.id },
      select: { id: true },
    });

    conversationId =
      existing?.id ??
      (
        await prisma.conversation.create({
          data: {
            listingId: booking.listingId,
            bookingId: booking.id,
            participants: {
              create: [{ userId: booking.guestId }, { userId: booking.hostId }],
            },
          },
          select: { id: true },
        })
      ).id;
  }

  await prisma.$transaction(async (tx) => {
    await tx.message.create({ data: { conversationId, senderId: user.id, body: data.body } });
    await tx.conversation.update({ where: { id: conversationId }, data: { lastMessageAt: new Date() } });

    // A host's reply in an inquiry-anchored thread satisfies that inquiry —
    // no separate "mark responded" click needed for the common path.
    const inquiry = await tx.inquiry.findUnique({
      where: { conversationId },
      select: { id: true, status: true, listing: { select: { hostId: true } } },
    });
    if (inquiry?.status === "OPEN" && inquiry.listing.hostId === user.id) {
      await tx.inquiry.update({ where: { id: inquiry.id }, data: { status: "RESPONDED" } });
    }
  });

  revalidatePath("/account-messages");
  revalidatePath(`/account-messages/${conversationId}`);
  revalidatePath("/account-inquiries");

  return { success: true, data: { conversationId } };
}

export async function markConversationRead(input: ConversationIdInput): Promise<ActionResult<null>> {
  const user = await requireAuth();
  const parsed = conversationIdSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid request" } };
  }

  const allowed = await isConversationParticipant(parsed.data.conversationId, user.id);
  if (!allowed) {
    return { success: false, error: { code: "FORBIDDEN", message: "You are not part of this conversation" } };
  }

  await prisma.message.updateMany({
    where: { conversationId: parsed.data.conversationId, senderId: { not: user.id }, readAt: null },
    data: { readAt: new Date() },
  });

  revalidatePath(`/account-messages/${parsed.data.conversationId}`);
  revalidatePath("/account-messages");

  return { success: true, data: null };
}

/**
 * The ADMIN dispute-resolution escape hatch (Domain Model Spec §2.12
 * permissions: "ADMIN may read for dispute resolution (audit-logged
 * access)"). Deliberately separate from getConversationById's normal
 * participant-only path rather than a silent bypass baked into it — every
 * call here writes an AuditLog row before returning data.
 */
export async function getConversationForAdmin(
  input: ConversationIdInput,
): Promise<ActionResult<NonNullable<Awaited<ReturnType<typeof getConversationByIdUnchecked>>>>> {
  const admin = await requireAdmin();
  const parsed = conversationIdSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid request" } };
  }

  const conversation = await getConversationByIdUnchecked(parsed.data.conversationId);
  if (!conversation) {
    return { success: false, error: { code: "NOT_FOUND", message: "Conversation not found" } };
  }

  await prisma.auditLog.create({
    data: {
      actorId: admin.id,
      action: "ADMIN_VIEWED_CONVERSATION",
      targetType: "Conversation",
      targetId: conversation.id,
    },
  });

  return { success: true, data: conversation };
}
