import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { getAllConversations } from "@/modules/messaging/admin-queries";
import {
  AdminPageHeader,
  AdminTableCard,
  AdminBadge,
} from "../AdminUI";

export const metadata = { title: "Messages – Admin" };

function relativeTime(date: Date): string {
  const now = Date.now();
  const diff = now - date.getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default async function AdminMessagesPage() {
  await requireAdmin();

  const { conversations, totalUnread } = await getAllConversations();

  return (
    <div>
      <AdminPageHeader
        title="Messages"
        description={`${conversations.length} conversation${conversations.length !== 1 ? "s" : ""} · ${totalUnread} unread`}
      />

      <AdminTableCard>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 dark:border-neutral-700 text-left">
              <th className="px-4 py-3 font-medium text-neutral-500 dark:text-neutral-400">Participants</th>
              <th className="px-4 py-3 font-medium text-neutral-500 dark:text-neutral-400 hidden sm:table-cell">Last Message</th>
              <th className="px-4 py-3 font-medium text-neutral-500 dark:text-neutral-400 hidden md:table-cell">Listing</th>
              <th className="px-4 py-3 font-medium text-neutral-500 dark:text-neutral-400">Type</th>
              <th className="px-4 py-3 font-medium text-neutral-500 dark:text-neutral-400">Time</th>
              <th className="px-4 py-3 font-medium text-neutral-500 dark:text-neutral-400"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700">
            {conversations.map((c) => {
              const participantNames = c.participants
                .map((p) => `${p.user.firstName} ${p.user.lastName}`)
                .join(", ");
              const lastMessage = c.messages[0];
              const preview = lastMessage?.body
                ? lastMessage.body.length > 80
                  ? lastMessage.body.slice(0, 80) + "..."
                  : lastMessage.body
                : "No messages";
              const type = c.booking
                ? "Booking"
                : c.inquiry
                  ? "Inquiry"
                  : "Direct";
              const typeTone = c.booking
                ? "blue" as const
                : c.inquiry
                  ? "purple" as const
                  : "gray" as const;

              return (
                <tr key={c.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-neutral-900 dark:text-neutral-100">
                      {participantNames}
                    </div>
                    <div className="text-xs text-neutral-400 truncate max-w-[200px]">
                      {c.participants.map((p) => p.user.email).join(", ")}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-neutral-600 dark:text-neutral-300 max-w-xs hidden sm:table-cell">
                    <span className="truncate block">{preview}</span>
                  </td>
                  <td className="px-4 py-3 text-neutral-600 dark:text-neutral-300 text-xs hidden md:table-cell">
                    {c.listing ? c.listing.title : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <AdminBadge tone={typeTone}>{type}</AdminBadge>
                  </td>
                  <td className="px-4 py-3 text-neutral-500 dark:text-neutral-400 text-xs whitespace-nowrap">
                    {relativeTime(c.lastMessageAt)}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/messages/${c.id}` as never}
                      className="text-sm text-primary-6000 hover:underline"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              );
            })}
            {conversations.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-neutral-500 dark:text-neutral-400">
                  No conversations yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </AdminTableCard>
    </div>
  );
}
