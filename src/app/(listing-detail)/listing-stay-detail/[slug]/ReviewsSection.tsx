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

// The real listing this site is based on — reviews originate there, so link
// back to them rather than presenting them as if collected on this site.
const AIRBNB_LISTING_URL = "https://www.airbnb.com/rooms/1181831259863542471";

function AirbnbIcon({ className }: { className?: string }) {
  return (
    <svg role="img" viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M12.001 18.275c-1.353-1.697-2.148-3.184-2.413-4.457-.263-1.027-.16-1.848.291-2.465.477-.71 1.188-1.056 2.121-1.056s1.643.345 2.12 1.063c.446.61.558 1.432.286 2.465-.291 1.298-1.085 2.785-2.412 4.458zm9.601 1.14c-.185 1.246-1.034 2.28-2.2 2.783-2.253.98-4.483-.583-6.392-2.704 3.157-3.951 3.74-7.028 2.385-9.018-.795-1.14-1.933-1.695-3.394-1.695-2.944 0-4.563 2.49-3.927 5.382.37 1.565 1.352 3.343 2.917 5.332-.98 1.085-1.91 1.856-2.732 2.333-.636.344-1.245.558-1.828.609-2.679.399-4.778-2.2-3.825-4.88.132-.345.395-.98.845-1.961l.025-.053c1.464-3.178 3.242-6.79 5.285-10.795l.053-.132.58-1.116c.45-.822.635-1.19 1.351-1.643.346-.21.77-.315 1.246-.315.954 0 1.698.558 2.016 1.007.158.239.345.557.582.953l.558 1.089.08.159c2.041 4.004 3.821 7.608 5.279 10.794l.026.025.533 1.22.318.764c.243.613.294 1.222.213 1.858zm1.22-2.39c-.186-.583-.505-1.271-.9-2.094v-.03c-1.889-4.006-3.642-7.608-5.307-10.844l-.111-.163C15.317 1.461 14.468 0 12.001 0c-2.44 0-3.476 1.695-4.535 3.898l-.081.16c-1.669 3.236-3.421 6.843-5.303 10.847v.053l-.559 1.22c-.21.504-.317.768-.345.847C-.172 20.74 2.611 24 5.98 24c.027 0 .132 0 .265-.027h.372c1.75-.213 3.554-1.325 5.384-3.317 1.829 1.989 3.635 3.104 5.382 3.317h.372c.133.027.239.027.265.027 3.37.003 6.152-3.261 4.802-6.975z" />
    </svg>
  );
}

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
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-2xl font-semibold">Reviews ({reviewCount})</h2>
        <a
          href={AIRBNB_LISTING_URL}
          target="_blank"
          rel="noreferrer"
          className="flex-shrink-0 inline-flex items-center gap-1.5 text-sm font-medium text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
        >
          <AirbnbIcon className="w-3.5 h-3.5" />
          See on Airbnb
        </a>
      </div>
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
