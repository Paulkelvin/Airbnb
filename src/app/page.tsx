import React from "react";
import SectionHero from "@/app/(server-components)/SectionHero";
import BgGlassmorphism from "@/components/BgGlassmorphism";
import SectionSliderNewCategories from "@/components/SectionSliderNewCategories";
import SectionFeaturedStays from "@/components/SectionFeaturedStays";
import BackgroundSection from "@/components/BackgroundSection";
import { searchListings } from "@/modules/listings/search";
import { searchParamsSchema } from "@/lib/validations/search";
import { getTopCities } from "@/modules/listings/queries";

export const dynamic = "force-dynamic";

async function PageHome() {
  const [{ items: featuredListings }, topCities] = await Promise.all([
    searchListings(searchParamsSchema.parse({ limit: 5, sort: "rating" })),
    getTopCities(6),
  ]);

  return (
    <main className="nc-PageHome relative overflow-hidden">
      <BgGlassmorphism />

      <div className="container relative space-y-24 mb-24 lg:space-y-28 lg:mb-28">
        <SectionHero className="pt-10 lg:pt-16 lg:pb-16" />

        <SectionSliderNewCategories
          heading="Popular destinations"
          subHeading="Explore the most booked cities on Potomac"
        />

        <div className="relative py-16">
          <BackgroundSection className="bg-orange-50 dark:bg-black/20" />
          <SectionSliderNewCategories
            itemPerRow={4}
            heading="Suggestions for discovery"
            subHeading="Hand-picked places to stay that we recommend for you"
            sliderStyle="style2"
          />
        </div>

        <SectionFeaturedStays listings={featuredListings} cities={topCities} />
      </div>
    </main>
  );
}

export default PageHome;
