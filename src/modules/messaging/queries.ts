import { prisma } from "@/lib/db";

const participantUserSelect = {
  id: true,
  firstName: true,
  lastName: true,
  avatarUrl: true,
} as const;

/** Conversation.listingId carries no Prisma relation (schema has no FK for it — a plain denormalized reference), so listing context is always resolved as a separate batched fetch, never an `include`. */
async function attachListing<T extends { listingId: string | null }>(
  conversation: T,
): Promise<T & { listing: { id: string; slug: string; title: string } | null }> {
  if (!conversation.listingId) return { ...conversation, listing: null };
  const listing = await prisma.listing.findUnique({
    where: { id: conversation.listingId },
    select: { id: true, slug: true, title: true },
  });
  return { ...conversation, listing };
}

export const conversationListInclude = {
  participants: { include: { user: { select: participantUserSelect } } },
  messages: { orderBy: { createdAt: "desc" as const }, take: 1 },
  booking: { select: { id: true, status: true, rentalType: true } },
  inquiry: { select: { id: true, status: true } },
} as const;

export async function getMyConversations(userId: string) {
  const conversations = await prisma.conversation.findMany({
    where: { participants: { some: { userId } } },
    include: conversationListInclude,
    orderBy: { lastMessageAt: "desc" },
  });

  const listingIds = Array.from(
    new Set(conversations.map((c) => c.listingId).filter((id): id is string => Boolean(id))),
  );
  const listings = listingIds.length
    ? await prisma.listing.findMany({
        where: { id: { in: listingIds } },
        select: { id: true, slug: true, title: true },
      })
    : [];
  const listingById = new Map(listings.map((l) => [l.id, l]));

  return conversations.map((c) => ({ ...c, listing: c.listingId ? (listingById.get(c.listingId) ?? null) : null }));
}

export const conversationThreadInclude = {
  participants: { include: { user: { select: participantUserSelect } } },
  messages: { orderBy: { createdAt: "asc" as const } },
  booking: { select: { id: true, status: true, rentalType: true } },
  inquiry: { select: { id: true, status: true } },
} as const;

/** Returns null both when the conversation doesn't exist and when the viewer isn't a participant — same as not-found, by design (no distinct "forbidden" signal to a non-participant probing IDs). */
export async function getConversationById(conversationId: string, viewerId: string) {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: conversationThreadInclude,
  });
  if (!conversation) return null;
  if (!conversation.participants.some((p) => p.userId === viewerId)) return null;

  return attachListing(conversation);
}

/** No participant check — used only by the explicit, audit-logged admin path in modules/messaging/actions.ts. */
export async function getConversationByIdUnchecked(conversationId: string) {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: conversationThreadInclude,
  });
  if (!conversation) return null;
  return attachListing(conversation);
}

export async function getUnreadMessageCount(userId: string): Promise<number> {
  return prisma.message.count({
    where: {
      readAt: null,
      senderId: { not: userId },
      conversation: { participants: { some: { userId } } },
    },
  });
}

/** Used by the booking detail page to decide "View conversation" vs. a fresh compose box — lazy creation happens only in sendMessage(). */
export async function getConversationIdForBooking(bookingId: string): Promise<string | null> {
  const conversation = await prisma.conversation.findUnique({
    where: { bookingId },
    select: { id: true },
  });
  return conversation?.id ?? null;
}

export async function isConversationParticipant(
  conversationId: string,
  userId: string,
): Promise<boolean> {
  const row = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
  });
  return Boolean(row);
}
