import { sanityClient } from "@/lib/sanity/client";
import { allFaqsQuery } from "@/lib/sanity/queries";
import { faqs as staticFaqs } from "@/data/faqs";
import type { FaqItem } from "@/app/faq/FaqAccordion";

/** Live FAQ content, matching the pattern in src/lib/local-experiences.ts —
 * falls back to static demo content if Sanity isn't configured or empty. */
export async function getFaqs(): Promise<FaqItem[]> {
  if (!process.env.NEXT_PUBLIC_SANITY_PROJECT_ID) return staticFaqs;
  try {
    const result = await sanityClient.fetch<FaqItem[]>(allFaqsQuery);
    return result.length > 0 ? result : staticFaqs;
  } catch {
    return staticFaqs;
  }
}
