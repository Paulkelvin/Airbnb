import React from "react";
import SectionHero from "@/app/(server-components)/SectionHero";
import BgGlassmorphism from "@/components/BgGlassmorphism";
import SectionSliderNewCategories from "@/components/SectionSliderNewCategories";
import SectionExploreArea from "@/components/SectionExploreArea";
import SectionWhyBookWithUs from "@/components/SectionWhyBookWithUs";
import SectionBlogHighlights from "@/components/SectionBlogHighlights";
import SectionFaqHighlights from "@/components/SectionFaqHighlights";
import {
  getFeaturedAttractions,
  getAllAttractions,
  getAttractionCategoryTaxonomies,
} from "@/lib/attractions";

export const dynamic = "force-dynamic";

async function PageHome() {
  const [featuredAttractions, allAttractions] = await Promise.all([
    getFeaturedAttractions(),
    getAllAttractions(),
  ]);
  const categoryTaxonomies = getAttractionCategoryTaxonomies(allAttractions);

  return (
    <main className="nc-PageHome relative overflow-hidden">
      <BgGlassmorphism />

      <div className="container relative space-y-24 mb-24 lg:space-y-28 lg:mb-28">
        <SectionHero className="pt-10 lg:pt-16 lg:pb-16" />

        <SectionSliderNewCategories
          heading="Explore by category"
          subHeading="Everything nearby, sorted the way you're already thinking about it"
          categories={categoryTaxonomies}
          countLabel="places"
        />

        <SectionWhyBookWithUs />

        <SectionExploreArea attractions={featuredAttractions} />

        <SectionBlogHighlights />

        <SectionFaqHighlights />
      </div>
    </main>
  );
}

export default PageHome;
