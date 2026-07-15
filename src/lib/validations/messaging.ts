import { z } from "zod";

/** Exactly one anchor: an existing thread, or a booking to lazily start/resume one on. */
export const sendMessageSchema = z
  .object({
    conversationId: z.string().uuid().optional(),
    bookingId: z.string().uuid().optional(),
    body: z.string().min(1).max(5000),
  })
  .refine((data) => Boolean(data.conversationId) !== Boolean(data.bookingId), {
    message: "Provide exactly one of conversationId or bookingId",
  });

export const conversationIdSchema = z.object({
  conversationId: z.string().uuid(),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type ConversationIdInput = z.infer<typeof conversationIdSchema>;
