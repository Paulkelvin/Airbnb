"use client";

import { Suspense } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Select from "@/components/ui/Select";
import { buildSearchUrl } from "./searchParamsUtil";

const SORT_LABELS: Record<string, string> = {
  relevance: "Best match",
  newest: "Newest",
  price_asc: "Price: low to high",
  price_desc: "Price: high to low",
  rating: "Top rated",
  distance: "Nearest",
};

function SortSelectInner({ availableSorts }: { availableSorts: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = searchParams.get("sort") ?? "";

  return (
    <Select
      className="w-auto"
      sizeClass="h-11 px-3"
      value={current}
      onChange={(e) => {
        router.push(
          buildSearchUrl(pathname, searchParams, { sort: e.target.value || undefined }) as never,
        );
      }}
    >
      <option value="">Sort by</option>
      {availableSorts.map((sort) => (
        <option key={sort} value={sort}>
          {SORT_LABELS[sort] ?? sort}
        </option>
      ))}
    </Select>
  );
}

export default function SortSelect(props: { availableSorts: string[] }) {
  return (
    <Suspense>
      <SortSelectInner {...props} />
    </Suspense>
  );
}
