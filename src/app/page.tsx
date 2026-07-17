import React from "react";
import SectionHero from "@/app/(server-components)/SectionHero";
import BgGlassmorphism from "@/components/BgGlassmorphism";
import SectionSliderNewCategories from "@/components/SectionSliderNewCategories";
import SectionFeaturedStays from "@/components/SectionFeaturedStays";
import SectionWhyBookWithUs from "@/components/SectionWhyBookWithUs";
import SectionBlogHighlights from "@/components/SectionBlogHighlights";
import SectionFaqHighlights from "@/components/SectionFaqHighlights";
import { searchListings } from "@/modules/listings/search";
import { searchParamsSchema } from "@/lib/validations/search";
import { getTopCities, getTopCityCategories } from "@/modules/listings/queries";

export const dynamic = "force-dynamic";

async function PageHome() {
  const [{ items: featuredListings }, topCities, cityCategories] = await Promise.all([
    searchListings(searchParamsSchema.parse({ limit: 6, sort: "rating" })),
    getTopCities(6),
    getTopCityCategories(8),
  ]);

  return (
    <main className="nc-PageHome relative overflow-hidden">
      <BgGlassmorphism />

      <div className="container relative space-y-24 mb-24 lg:space-y-28 lg:mb-28">
        <SectionHero className="pt-10 lg:pt-16 lg:pb-16" />

        <SectionSliderNewCategories
          heading="Top cities to explore"
          subHeading="The cities guests love most"
          categories={cityCategories}
        />

        <SectionWhyBookWithUs />

        <SectionFeaturedStays listings={featuredListings} cities={topCities} />

        <SectionBlogHighlights />

        <SectionFaqHighlights />
      </div>
    </main>
  );
}

export default PageHome;
