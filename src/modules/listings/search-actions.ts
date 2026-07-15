"use server";

import { searchListings, type SearchResult } from "./search";
import { searchParamsSchema } from "@/lib/validations/search";

/**
 * Client-callable wrapper around searchListings(), used for "Load more"
 * pagination — the only part of search that needs genuine client-side
 * fetching rather than a URL navigation, since it appends to an existing
 * result list instead of replacing the page.
 */
export async function loadMoreListings(
  rawParams: Record<string, string | undefined>,
): Promise<SearchResult> {
  const parsed = searchParamsSchema.parse(rawParams);
  return searchListings(parsed);
}
