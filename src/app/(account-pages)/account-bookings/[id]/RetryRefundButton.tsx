"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { adminRetryRefund } from "@/modules/bookings/actions";

export default function RetryRefundButton({ paymentId }: { paymentId: string }) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const router = useRouter();

  function handleRetry() {
    if (!confirm("Retry this refund? This will attempt to send money back to the guest's card.")) return;
    setMessage(null);
    startTransition(async () => {
      const result = await adminRetryRefund(paymentId);
      if (result.success) {
        setMessage({ text: "Refund succeeded!", ok: true });
        router.refresh();
      } else {
        setMessage({ text: result.error.message, ok: false });
      }
    });
  }

  return (
    <div className="mt-1">
      <button
        onClick={handleRetry}
        disabled={isPending}
        className="px-3 py-1 text-xs rounded-full bg-primary-6000 text-white hover:bg-primary-700 disabled:opacity-50"
      >
        {isPending ? "Retrying…" : "Retry refund"}
      </button>
      {message && (
        <p className={`text-xs mt-1 ${message.ok ? "text-green-600" : "text-red-600"}`}>
          {message.text}
        </p>
      )}
    </div>
  );
}
