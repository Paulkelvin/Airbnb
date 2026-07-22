import { notFound } from "next/navigation";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { getConversationByIdUnchecked } from "@/modules/messaging/queries";
import { AdminPageHeader, AdminBadge } from "../../AdminUI";

export const metadata = { title: "Conversation – Admin" };

function formatMessageTime(date: Date): string {
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function AdminConversationDetailPage({
  params,
}: {
  params: { id: string };
}) {
  await requireAdmin();

  const conversation = await getConversationByIdUnchecked(params.id);
  if (!conversation) {
    notFound();
  }

  const participantMap = new Map(
    conversation.participants.map((p) => [
      p.userId,
      `${p.user.firstName} ${p.user.lastName}`,
    ]),
  );

  return (
    <div>
      <AdminPageHeader
        title="Conversation"
        description={`${conversation.messages.length} message${conversation.messages.length !== 1 ? "s" : ""}`}
      />

      <div className="mb-6">
        <Link
          href={"/admin/messages" as never}
          className="text-sm text-neutral-500 hover:underline"
        >
          &larr; Back to all messages
        </Link>
      </div>

      <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-4 mb-6 space-y-3">
        <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
          Conversation Context
        </h3>

        <div className="flex flex-wrap gap-4 text-sm">
          <div>
            <span className="text-neutral-500 dark:text-neutral-400">Participants: </span>
            <span className="text-neutral-900 dark:text-neutral-100">
              {conversation.participants
                .map((p) => `${p.user.firstName} ${p.user.lastName}`)
                .join(", ")}
            </span>
          </div>

          {conversation.listing && (
            <div>
              <span className="text-neutral-500 dark:text-neutral-400">Listing: </span>
              <span className="text-neutral-900 dark:text-neutral-100">
                {conversation.listing.title}
              </span>
            </div>
          )}

          {conversation.booking && (
            <div className="flex items-center gap-2">
              <span className="text-neutral-500 dark:text-neutral-400">Booking: </span>
              <AdminBadge tone="blue">
                {conversation.booking.status.replace(/_/g, " ")}
              </AdminBadge>
              <span className="text-xs text-neutral-400 font-mono">
                {conversation.booking.id.slice(0, 8)}...
              </span>
            </div>
          )}

          {conversation.inquiry && (
            <div className="flex items-center gap-2">
              <span className="text-neutral-500 dark:text-neutral-400">Inquiry: </span>
              <AdminBadge tone="purple">
                {conversation.inquiry.status.replace(/_/g, " ")}
              </AdminBadge>
              <span className="text-xs text-neutral-400 font-mono">
                {conversation.inquiry.id.slice(0, 8)}...
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 overflow-hidden">
        <div className="p-4 space-y-4">
          {conversation.messages.length === 0 && (
            <p className="text-center text-neutral-500 dark:text-neutral-400 py-8">
              No messages in this conversation
            </p>
          )}
          {conversation.messages.map((m) => {
            const senderName = participantMap.get(m.senderId) ?? "Unknown";
            return (
              <div key={m.id} className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center text-xs font-medium text-neutral-600 dark:text-neutral-300">
                  {senderName.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                      {senderName}
                    </span>
                    <span className="text-xs text-neutral-400">
                      {formatMessageTime(m.createdAt)}
                    </span>
                    {!m.readAt && (
                      <span className="w-2 h-2 rounded-full bg-primary-6000 flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-sm text-neutral-700 dark:text-neutral-300 mt-0.5 whitespace-pre-line">
                    {m.body}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
