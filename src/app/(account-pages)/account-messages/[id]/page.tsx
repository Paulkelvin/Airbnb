import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getConversationById } from "@/modules/messaging/queries";
import MessageThread from "./MessageThread";
import type { Route } from "@/routers/types";

export const metadata = {
  title: "Conversation",
};

export default async function ConversationPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const conversation = await getConversationById(params.id, user.id);
  if (!conversation) {
    notFound();
  }

  const other = conversation.participants.find((p) => p.userId !== user.id)?.user ?? null;

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div>
        <Link href={"/account-messages" as Route} className="text-sm text-neutral-500 hover:underline">
          &larr; Back to messages
        </Link>
        <h2 className="text-2xl font-semibold mt-2">
          {other ? [other.firstName, other.lastName].filter(Boolean).join(" ") : "Conversation"}
        </h2>
        {conversation.listing && (
          <Link
            href={`/listing-stay-detail/${conversation.listing.slug}` as Route}
            className="text-sm text-primary-6000 hover:underline"
          >
            {conversation.listing.title}
          </Link>
        )}
      </div>

      <MessageThread
        conversationId={conversation.id}
        currentUserId={user.id}
        initialMessages={conversation.messages.map((m) => ({
          id: m.id,
          senderId: m.senderId,
          body: m.body ?? "",
          createdAt: m.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
