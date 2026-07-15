"use client";

/** Builds a new query string from the current URL's params, overriding/removing the given keys. */
export function buildSearchUrl(
  pathname: string,
  currentParams: URLSearchParams,
  updates: Record<string, string | number | undefined | null>,
): string {
  const next = new URLSearchParams(currentParams.toString());

  for (const [key, value] of Object.entries(updates)) {
    if (value === undefined || value === null || value === "") {
      next.delete(key);
    } else {
      next.set(key, String(value));
    }
  }

  // Any filter change invalidates the current pagination cursor.
  if (!("cursor" in updates)) {
    next.delete("cursor");
  }

  const qs = next.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}
