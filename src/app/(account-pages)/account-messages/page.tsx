import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getMyConversations } from "@/modules/messaging/queries";
import Avatar from "@/components/ui/Avatar";
import type { Route } from "@/routers/types";

export const metadata = {
  title: "Messages",
};

function formatTimestamp(date: Date) {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default async function AccountMessagesPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const conversations = await getMyConversations(user.id);

  return (
    <div className="space-y-6 sm:space-y-8">
      <h1 className="text-3xl font-semibold">Messages</h1>
      <div className="w-14 border-b border-neutral-200 dark:border-neutral-700" />

      {conversations.length === 0 ? (
        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-700 p-12 text-center">
          <p className="text-neutral-500 dark:text-neutral-400">No conversations yet.</p>
          <p className="text-sm text-neutral-400 dark:text-neutral-500 mt-2">
            Messages from hosts and guests will appear here once you book a stay or receive a booking.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-neutral-200 dark:divide-neutral-700 rounded-2xl border border-neutral-200 dark:border-neutral-700 overflow-hidden">
          {conversations.map((c) => {
            const other = c.participants.find((p) => p.userId !== user.id)?.user;
            const lastMessage = c.messages[0];
            const isUnread = lastMessage && lastMessage.senderId !== user.id && !lastMessage.readAt;

            return (
              <Link
                key={c.id}
                href={`/account-messages/${c.id}` as Route}
                className="flex items-center gap-4 p-4 sm:p-5 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
              >
                <Avatar imgUrl={other?.avatarUrl ?? undefined} sizeClass="h-12 w-12" radius="rounded-full" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className={`truncate ${isUnread ? "font-semibold" : "font-medium"}`}>
                      {other ? [other.firstName, other.lastName].filter(Boolean).join(" ") : "Unknown"}
                    </h3>
                    {isUnread && <span className="w-2 h-2 rounded-full bg-primary-6000 flex-shrink-0" />}
                  </div>
                  {c.listing && (
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">{c.listing.title}</p>
                  )}
                  {lastMessage && (
                    <p className="text-sm text-neutral-600 dark:text-neutral-300 truncate mt-0.5">
                      {lastMessage.body}
                    </p>
                  )}
                </div>
                <span className="text-xs text-neutral-400 flex-shrink-0">
                  {formatTimestamp(c.lastMessageAt)}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
