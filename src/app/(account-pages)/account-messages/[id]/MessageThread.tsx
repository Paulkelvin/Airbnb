"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import ButtonPrimary from "@/components/ui/ButtonPrimary";
import { sendMessage, markConversationRead } from "@/modules/messaging/actions";

interface ThreadMessage {
  id: string;
  senderId: string;
  body: string;
  createdAt: string;
}

export default function MessageThread({
  conversationId,
  currentUserId,
  initialMessages,
}: {
  conversationId: string;
  currentUserId: string;
  initialMessages: ThreadMessage[];
}) {
  const router = useRouter();
  // Deliberately not copied into local state: the parent Server Component
  // re-fetches and passes fresh messages on every router.refresh() after a
  // send, and a useState(initialMessages) here would freeze on the first
  // render's value and never pick that up.
  const messages = initialMessages;
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    markConversationRead({ conversationId });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "auto" });
  }, [messages.length]);

  function handleSend() {
    const trimmed = body.trim();
    if (!trimmed) return;
    setError(null);
    startTransition(async () => {
      const result = await sendMessage({ conversationId, body: trimmed });
      if (!result.success) {
        setError(result.error.message);
        return;
      }
      setBody("");
      router.refresh();
    });
  }

  return (
    <div className="rounded-2xl border border-neutral-200 dark:border-neutral-700 flex flex-col h-[28rem]">
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((m) => {
          const isMine = m.senderId === currentUserId;
          return (
            <div key={m.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                  isMine
                    ? "bg-primary-6000 text-white"
                    : "bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                }`}
              >
                <p className="whitespace-pre-line">{m.body}</p>
                <p className={`text-xs mt-1 ${isMine ? "text-white/70" : "text-neutral-400"}`}>
                  {new Date(m.createdAt).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-neutral-200 dark:border-neutral-700 p-3 space-y-2">
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-2">
          <textarea
            className="flex-1 rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-transparent px-3 py-2 text-sm resize-none"
            rows={1}
            placeholder="Write a message..."
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <ButtonPrimary
            sizeClass="px-5 py-2"
            fontSize="text-sm"
            disabled={!body.trim() || isPending}
            loading={isPending}
            onClick={handleSend}
          >
            Send
          </ButtonPrimary>
        </div>
      </div>
    </div>
  );
}
