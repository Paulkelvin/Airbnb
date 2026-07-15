"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import ButtonPrimary from "@/components/ui/ButtonPrimary";
import ButtonSecondary from "@/components/ui/ButtonSecondary";
import { sendMessage } from "@/modules/messaging/actions";
import type { Route } from "@/routers/types";

export default function BookingMessageEntry({
  bookingId,
  existingConversationId,
  counterpartyName,
}: {
  bookingId: string;
  existingConversationId: string | null;
  counterpartyName: string;
}) {
  const router = useRouter();
  const [composing, setComposing] = useState(false);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (existingConversationId) {
    return (
      <ButtonSecondary
        onClick={() => router.push(`/account-messages/${existingConversationId}` as Route)}
      >
        View conversation
      </ButtonSecondary>
    );
  }

  if (!composing) {
    return <ButtonSecondary onClick={() => setComposing(true)}>Message {counterpartyName}</ButtonSecondary>;
  }

  function handleSend() {
    const trimmed = body.trim();
    if (!trimmed) return;
    setError(null);
    startTransition(async () => {
      const result = await sendMessage({ bookingId, body: trimmed });
      if (!result.success) {
        setError(result.error.message);
        return;
      }
      router.push(`/account-messages/${result.data.conversationId}` as Route);
    });
  }

  return (
    <div className="space-y-2 max-w-md">
      <textarea
        className="w-full rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-transparent p-3 text-sm"
        rows={3}
        placeholder={`Message ${counterpartyName}...`}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        autoFocus
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <ButtonPrimary
          sizeClass="px-4 py-2"
          fontSize="text-sm"
          disabled={!body.trim() || isPending}
          loading={isPending}
          onClick={handleSend}
        >
          Send
        </ButtonPrimary>
        <ButtonSecondary sizeClass="px-4 py-2" fontSize="text-sm" onClick={() => setComposing(false)}>
          Cancel
        </ButtonSecondary>
      </div>
    </div>
  );
}
