import BgGlassmorphism from "@/components/BgGlassmorphism";
import { getFaqs } from "@/lib/faqs";
import FaqAccordion from "./FaqAccordion";

export const revalidate = 3600;

export const metadata = {
  title: "Help Centre",
};

export default async function FaqPage() {
  const faqs = await getFaqs();

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
