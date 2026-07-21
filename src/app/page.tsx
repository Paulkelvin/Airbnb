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
import { getPrimaryListing } from "@/modules/listings/queries";
import type { Route } from "@/routers/types";

export const dynamic = "force-dynamic";

async function PageHome() {
  const [featuredAttractions, allAttractions, primaryListing] = await Promise.all([
    getFeaturedAttractions(),
    getAllAttractions(),
    getPrimaryListing(),
  ]);
  const categoryTaxonomies = getAttractionCategoryTaxonomies(allAttractions);
  const listingHref = primaryListing
    ? (`/listing-stay-detail/${primaryListing.slug}` as Route)
    : null;

  return (
    <main className="nc-PageHome relative overflow-hidden">
      <BgGlassmorphism />

      <div className="container relative space-y-24 mb-24 lg:space-y-28 lg:mb-28">
        <SectionHero className="pt-10 lg:pt-16 lg:pb-16" listingHref={listingHref} />

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
