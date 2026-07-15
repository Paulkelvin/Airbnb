"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import ButtonPrimary from "@/components/ui/ButtonPrimary";
import ButtonSecondary from "@/components/ui/ButtonSecondary";
import { createReview } from "@/modules/reviews/actions";

const SUB_RATING_FIELDS = ["cleanliness", "communication", "accuracy", "location", "value"] as const;
type SubRatingKey = (typeof SUB_RATING_FIELDS)[number];

export default function ReviewPrompt({
  bookingId,
  counterpartyName,
  isGuest,
  alreadyReviewed,
}: {
  bookingId: string;
  counterpartyName: string;
  isGuest: boolean;
  alreadyReviewed: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitted, setSubmitted] = useState(alreadyReviewed);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [subRatings, setSubRatings] = useState<Record<SubRatingKey, number>>({
    cleanliness: 5,
    communication: 5,
    accuracy: 5,
    location: 5,
    value: 5,
  });
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (submitted) {
    return <p className="text-sm text-neutral-500">Thanks — your review has been submitted.</p>;
  }

  if (!open) {
    return <ButtonSecondary onClick={() => setOpen(true)}>Leave a review for {counterpartyName}</ButtonSecondary>;
  }

  function handleSubmit() {
    const trimmed = comment.trim();
    if (!trimmed) return;
    setError(null);
    startTransition(async () => {
      const result = await createReview({
        bookingId,
        rating,
        comment: trimmed,
        subRatings: isGuest ? subRatings : undefined,
      });
      if (!result.success) {
        setError(result.error.message);
        return;
      }
      setSubmitted(true);
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <div className="space-y-3 max-w-md">
      <RatingSelect label="Overall rating" value={rating} onChange={setRating} />
      {isGuest && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {SUB_RATING_FIELDS.map((key) => (
            <RatingSelect
              key={key}
              label={key.charAt(0).toUpperCase() + key.slice(1)}
              value={subRatings[key]}
              onChange={(v) => setSubRatings((prev) => ({ ...prev, [key]: v }))}
              compact
            />
          ))}
        </div>
      )}
      <textarea
        className="w-full rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-transparent p-3 text-sm"
        rows={4}
        placeholder={`Share your experience with ${counterpartyName}...`}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        autoFocus
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <ButtonPrimary
          sizeClass="px-4 py-2"
          fontSize="text-sm"
          disabled={!comment.trim() || isPending}
          loading={isPending}
          onClick={handleSubmit}
        >
          Submit review
        </ButtonPrimary>
        <ButtonSecondary sizeClass="px-4 py-2" fontSize="text-sm" onClick={() => setOpen(false)}>
          Cancel
        </ButtonSecondary>
      </div>
    </div>
  );
}

function RatingSelect({
  label,
  value,
  onChange,
  compact,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  compact?: boolean;
}) {
  return (
    <label className={`flex items-center justify-between gap-2 ${compact ? "text-xs" : "text-sm"}`}>
      <span className="text-neutral-500">{label}</span>
      <select
        className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-transparent py-1 px-2"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      >
        {[5, 4, 3, 2, 1].map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>
    </label>
  );
}
