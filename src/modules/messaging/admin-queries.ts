import { prisma } from "@/lib/db";

const adminParticipantUserSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  avatarUrl: true,
} as const;

const adminConversationListInclude = {
  participants: { include: { user: { select: adminParticipantUserSelect } } },
  messages: { orderBy: { createdAt: "desc" as const }, take: 1 },
  booking: { select: { id: true, status: true } },
  inquiry: { select: { id: true, status: true } },
} as const;

export async function getAllConversations() {
  const conversations = await prisma.conversation.findMany({
    include: adminConversationListInclude,
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

  const totalUnread = await prisma.message.count({
    where: { readAt: null },
  });

  const enriched = conversations.map((c) => ({
    ...c,
    listing: c.listingId ? (listingById.get(c.listingId) ?? null) : null,
  }));

  return { conversations: enriched, totalUnread };
}
