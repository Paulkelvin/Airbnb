"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { createInquirySchema, inquiryIdSchema, type CreateInquiryInput, type InquiryIdInput } from "@/lib/validations/inquiry";
import type { ActionResult } from "@/lib/validations/auth";
import { notify } from "@/modules/notifications/notify";

export async function createInquiry(
  input: CreateInquiryInput,
): Promise<ActionResult<{ id: string }>> {
  const user = await requireAuth();

  const rateLimit = await checkRateLimit(`inquiry:${user.id}`, RATE_LIMITS.INQUIRY_CREATE);
  if (!rateLimit.allowed) {
    return {
      success: false,
      error: {
        code: "RATE_LIMITED",
        message: `Too many inquiries sent. Please try again in ${rateLimit.retryAfterSeconds}s.`,
      },
    };
  }

  const parsed = createInquirySchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid inquiry",
        fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      },
    };
  }
  const data = parsed.data;

  const listing = await prisma.listing.findUnique({
    where: { id: data.listingId },
    select: { id: true, hostId: true, status: true, slug: true, title: true },
  });
  if (!listing || listing.status !== "PUBLISHED") {
    return { success: false, error: { code: "NOT_FOUND", message: "Listing not found" } };
  }
  if (listing.hostId === user.id) {
    return {
      success: false,
      error: { code: "FORBIDDEN", message: "You cannot send an inquiry about your own listing" },
    };
  }

  // Conversation created here, not lazily on first "message" — the inquiry's own
  // text already is that thread's first message (Domain Model Spec §2.12 lifecycle).
  const inquiry = await prisma.$transaction(async (tx) => {
    const conversation = await tx.conversation.create({
      data: {
        listingId: listing.id,
        participants: { create: [{ userId: user.id }, { userId: listing.hostId }] },
      },
      select: { id: true },
    });

    await tx.message.create({
      data: { conversationId: conversation.id, senderId: user.id, body: data.message },
    });

    const created = await tx.inquiry.create({
      data: {
        listingId: listing.id,
        senderId: user.id,
        message: data.message,
        preferredDate: data.preferredDate,
        status: "OPEN",
        conversationId: conversation.id,
      },
      select: { id: true },
    });

    // Conversation.inquiryId is a denormalized reverse pointer (no FK — same as
    // listingId); the real relation is driven by Inquiry.conversationId above.
    await tx.conversation.update({
      where: { id: conversation.id },
      data: { inquiryId: created.id },
    });

    return created;
  });

  await notify(listing.hostId, "NEW_INQUIRY", {
    inquiryId: inquiry.id,
    listingTitle: listing.title,
    senderName: `${user.firstName} ${user.lastName}`,
    message: data.message,
  });

  revalidatePath("/account-inquiries");
  revalidatePath("/account-messages");

  return { success: true, data: { id: inquiry.id } };
}

async function transitionInquiryStatus(
  input: InquiryIdInput,
  nextStatus: "RESPONDED" | "CLOSED",
  allowedRoles: ("sender" | "host")[],
): Promise<ActionResult<{ id: string }>> {
  const user = await requireAuth();
  const parsed = inquiryIdSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid request" } };
  }

  const inquiry = await prisma.inquiry.findUnique({
    where: { id: parsed.data.inquiryId },
    include: { listing: { select: { hostId: true } } },
  });
  if (!inquiry) {
    return { success: false, error: { code: "NOT_FOUND", message: "Inquiry not found" } };
  }

  const isSender = inquiry.senderId === user.id;
  const isHost = inquiry.listing.hostId === user.id;
  const isAdmin = user.roles.includes("ADMIN");
  const permitted =
    isAdmin || (allowedRoles.includes("sender") && isSender) || (allowedRoles.includes("host") && isHost);
  if (!permitted) {
    return { success: false, error: { code: "FORBIDDEN", message: "You do not own this inquiry" } };
  }

  if (inquiry.status === "CLOSED" || inquiry.status === "CONVERTED") {
    return {
      success: false,
      error: { code: "INVALID_STATE", message: "This inquiry is already closed" },
    };
  }

  await prisma.inquiry.update({ where: { id: inquiry.id }, data: { status: nextStatus } });

  revalidatePath("/account-inquiries");

  return { success: true, data: { id: inquiry.id } };
}

/** Host marks an inquiry as responded (the reply itself is sent out-of-band — no in-app messaging yet). */
export async function markInquiryResponded(input: InquiryIdInput) {
  return transitionInquiryStatus(input, "RESPONDED", ["host"]);
}

/** Either party closes an inquiry that no longer needs attention. */
export async function closeInquiry(input: InquiryIdInput) {
  return transitionInquiryStatus(input, "CLOSED", ["sender", "host"]);
}
