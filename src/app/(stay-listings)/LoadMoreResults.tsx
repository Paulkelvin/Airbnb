"use client";

import { useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import StayCard from "@/components/StayCard";
import ButtonSecondary from "@/components/ui/ButtonSecondary";
import { loadMoreListings } from "@/modules/listings/search-actions";
import type { StayDataType } from "@/data/types";

export default function LoadMoreResults({
  initialItems,
  initialNextCursor,
}: {
  initialItems: StayDataType[];
  initialNextCursor: string | null;
}) {
  const searchParams = useSearchParams();
  const [items, setItems] = useState(initialItems);
  const [nextCursor, setNextCursor] = useState(initialNextCursor);
  const [isPending, startTransition] = useTransition();

  function handleLoadMore() {
    if (!nextCursor) return;
    startTransition(async () => {
      const params: Record<string, string> = {};
      searchParams.forEach((value, key) => {
        params[key] = value;
      });
      params.cursor = nextCursor;

      const result = await loadMoreListings(params);
      setItems((prev) => [...prev, ...result.items]);
      setNextCursor(result.nextCursor);
    });
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-6 md:gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {items.map((stay) => (
          <StayCard key={stay.id} data={stay} />
        ))}
      </div>
      {nextCursor && (
        <div className="flex mt-16 justify-center items-center">
          <ButtonSecondary onClick={handleLoadMore} loading={isPending} disabled={isPending}>
            Show me more
          </ButtonSecondary>
        </div>
      )}
    </>
  );
}
