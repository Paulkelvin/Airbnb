"use client";

import { useState, useTransition } from "react";
import { StarIcon } from "@heroicons/react/24/solid";
import Avatar from "@/components/ui/Avatar";
import ButtonPrimary from "@/components/ui/ButtonPrimary";
import ButtonSecondary from "@/components/ui/ButtonSecondary";
import StartRating from "@/components/StartRating";
import { respondToReview } from "@/modules/reviews/actions";

export interface ListingReview {
  id: string;
  rating: number;
  comment: string;
  hostResponse: string | null;
  publishedAt: string | null;
  subRatings: { cleanliness: number; communication: number; accuracy: number; location: number; value: number } | null;
  author: { id: string; firstName: string; lastName: string; avatarUrl: string | null };
}

const SUB_RATING_LABELS: Record<string, string> = {
  cleanliness: "Cleanliness",
  communication: "Communication",
  accuracy: "Accuracy",
  location: "Location",
  value: "Value",
};

export default function ReviewsSection({
  reviews,
  avgRating,
  reviewCount,
  isOwner,
}: {
  reviews: ListingReview[];
  avgRating: number;
  reviewCount: number;
  isOwner: boolean;
}) {
  return (
    <div className="listingSection__wrap">
      <h2 className="text-2xl font-semibold">Reviews ({reviewCount})</h2>
      {reviewCount === 0 ? (
        <p className="text-neutral-500">No reviews yet.</p>
      ) : (
        <>
          <StartRating point={avgRating} reviewCount={reviewCount} />
          <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {reviews.map((review) => (
              <ReviewItem key={review.id} review={review} isOwner={isOwner} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function ReviewItem({ review, isOwner }: { review: ListingReview; isOwner: boolean }) {
  const [responding, setResponding] = useState(false);
  const [response, setResponse] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [hostResponse, setHostResponse] = useState(review.hostResponse);
  const [isPending, startTransition] = useTransition();

  function handleSubmitResponse() {
    const trimmed = response.trim();
    if (!trimmed) return;
    setError(null);
    startTransition(async () => {
      const result = await respondToReview({ reviewId: review.id, response: trimmed });
      if (!result.success) {
        setError(result.error.message);
        return;
      }
      setHostResponse(trimmed);
      setResponding(false);
    });
  }

  return (
    <div className="py-5 space-y-3">
      <div className="flex items-center gap-3">
        <Avatar imgUrl={review.author.avatarUrl ?? undefined} sizeClass="h-9 w-9" radius="rounded-full" />
        <div>
          <p className="font-medium text-sm">
            {review.author.firstName} {review.author.lastName}
          </p>
          {review.publishedAt && (
            <p className="text-xs text-neutral-400">
              {new Date(review.publishedAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </p>
          )}
        </div>
        <span className="ml-auto flex items-center gap-1 text-sm font-medium">
          <StarIcon className="w-4 h-4 text-orange-500" />
          {review.rating}
        </span>
      </div>

      <p className="text-sm text-neutral-700 dark:text-neutral-300 whitespace-pre-line">{review.comment}</p>

      {review.subRatings && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs text-neutral-500">
          {Object.entries(review.subRatings).map(([key, value]) => (
            <div key={key}>
              {SUB_RATING_LABELS[key] ?? key}: <span className="font-medium">{value}</span>
            </div>
          ))}
        </div>
      )}

      {hostResponse && (
        <div className="ml-6 pl-4 border-l-2 border-neutral-200 dark:border-neutral-700 text-sm">
          <p className="font-medium text-xs text-neutral-500 mb-1">Response from host</p>
          <p className="text-neutral-700 dark:text-neutral-300 whitespace-pre-line">{hostResponse}</p>
        </div>
      )}

      {isOwner && !hostResponse && (
        <div className="ml-6">
          <div className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out ${!responding ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
            <div className="overflow-hidden">
              <ButtonSecondary sizeClass="px-3 py-1.5" fontSize="text-xs" onClick={() => setResponding(true)}>
                Respond
              </ButtonSecondary>
            </div>
          </div>
          <div className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out ${responding ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
            <div className="overflow-hidden">
              <div className="space-y-2 max-w-md">
                <textarea
                  className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-transparent p-2 text-sm"
                  rows={2}
                  placeholder="Write a public response..."
                  value={response}
                  onChange={(e) => setResponse(e.target.value)}
                  autoFocus={responding}
                />
                {error && <p className="text-xs text-red-600">{error}</p>}
                <div className="flex gap-2">
                  <ButtonPrimary
                    sizeClass="px-3 py-1.5"
                    fontSize="text-xs"
                    disabled={!response.trim() || isPending}
                    loading={isPending}
                    onClick={handleSubmitResponse}
                  >
                    Post response
                  </ButtonPrimary>
                  <ButtonSecondary sizeClass="px-3 py-1.5" fontSize="text-xs" onClick={() => setResponding(false)}>
                    Cancel
                  </ButtonSecondary>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
