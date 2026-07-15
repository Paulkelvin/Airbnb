"use client";

import React, { useState, useTransition } from "react";
import ButtonPrimary from "@/components/ui/ButtonPrimary";
import { createInquiry } from "@/modules/inquiries/actions";

export default function InquiryForm({
  listingId,
  isAuthenticated,
}: {
  listingId: string;
  isAuthenticated: boolean;
}) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (!isAuthenticated) return null;

  if (sent) {
    return (
      <p className="text-sm text-green-700 dark:text-green-400">
        Your question has been sent to the host.
      </p>
    );
  }

  function handleSubmit() {
    if (!message.trim()) return;
    setError(null);
    startTransition(async () => {
      const result = await createInquiry({ listingId, message: message.trim() });
      if (!result.success) {
        setError(result.error.message);
        return;
      }
      setSent(true);
    });
  }

  return (
    <div className="space-y-3">
      <textarea
        className="w-full rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-transparent p-3 text-sm"
        rows={3}
        placeholder="Ask the host a question about this listing..."
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <ButtonPrimary
        sizeClass="px-4 py-2"
        fontSize="text-sm"
        disabled={!message.trim() || isPending}
        loading={isPending}
        onClick={handleSubmit}
      >
        Send question
      </ButtonPrimary>
    </div>
  );
}
