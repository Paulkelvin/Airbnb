import { createClient } from "@sanity/client";
import { sanityConfig } from "@/lib/sanity/config";

/** Dedicated write-capable client for the admin CMS, separate from the
 * public site's read client (src/lib/sanity/client.ts) — that one uses the
 * CDN in production for performance, which would make admin edits look
 * like they hadn't saved for up to a minute. Always reads/writes direct. */
export const sanityAdminClient = createClient({
  ...sanityConfig,
  useCdn: false,
  token: process.env.SANITY_API_TOKEN,
});
