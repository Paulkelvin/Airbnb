export const sanityConfig = {
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "",
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || "production",
  apiVersion: "2024-01-01",
  // Sanity's CDN caches query responses independently of Next's own
  // caching, on its own TTL — a content edit can be genuinely published
  // and still not show up live for a stretch after. This is a low-traffic,
  // single-listing site where "changes show up right away" matters far
  // more than shaving CDN-vs-API latency, so read straight from the API.
  useCdn: false,
};
