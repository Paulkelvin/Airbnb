import BgGlassmorphism from "@/components/BgGlassmorphism";
import { sanityClient } from "@/lib/sanity/client";
import { allFaqsQuery } from "@/lib/sanity/queries";
import { faqs as staticFaqs } from "@/data/faqs";
import FaqAccordion, { type FaqItem } from "./FaqAccordion";

export const revalidate = 3600;

export const metadata = {
  title: "Help Centre",
};

async function getFaqs(): Promise<FaqItem[] | null> {
  if (!process.env.NEXT_PUBLIC_SANITY_PROJECT_ID) return null;
  try {
    const result = await sanityClient.fetch<FaqItem[]>(allFaqsQuery);
    return result.length > 0 ? result : null;
  } catch {
    return null;
  }
}

export default async function FaqPage() {
  const faqs = (await getFaqs()) ?? staticFaqs;

  return (
    <div className="nc-FaqPage overflow-hidden relative">
      <BgGlassmorphism />
      <div className="container relative py-16 lg:py-28">
        <h1 className="text-3xl md:text-4xl font-semibold">Help Centre</h1>
        <span className="block mt-3 text-neutral-500 dark:text-neutral-400 text-lg">
          Everything you need to know about booking, hosting, and staying with Potomac.
        </span>
        <FaqAccordion faqs={faqs} />
      </div>
    </div>
  );
}
