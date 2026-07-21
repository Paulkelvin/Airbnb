import React from "react";
import SectionHero from "@/app/(server-components)/SectionHero";
import BgGlassmorphism from "@/components/BgGlassmorphism";
import SectionExploreArea from "@/components/SectionExploreArea";
import SectionWhyBookWithUs from "@/components/SectionWhyBookWithUs";
import SectionBlogHighlights from "@/components/SectionBlogHighlights";
import SectionFaqHighlights from "@/components/SectionFaqHighlights";
import { getFeaturedExperiences, getAllExperiences } from "@/lib/local-experiences";
import { getPrimaryListing } from "@/modules/listings/queries";
import { fuzzCoordinates } from "@/lib/geo-fuzz";
import type { Route } from "@/routers/types";

export const dynamic = "force-dynamic";

async function PageHome() {
  const [featuredExperiences, allExperiences, primaryListing] = await Promise.all([
    getFeaturedExperiences(),
    getAllExperiences(),
    getPrimaryListing(),
  ]);
  const listingHref = primaryListing
    ? (`/listing-stay-detail/${primaryListing.slug}` as Route)
    : null;

  return (
    <main className="nc-PageHome relative overflow-hidden">
      <BgGlassmorphism />

      <div className="container relative space-y-24 mb-24 lg:space-y-28 lg:mb-28">
        <SectionHero className="pt-10 lg:pt-16 lg:pb-16" listingHref={listingHref} />

        <SectionWhyBookWithUs />

        <SectionExploreArea
          experiences={featuredExperiences}
          cottage={
            primaryListing?.latitude != null && primaryListing?.longitude != null
              ? {
                  ...fuzzCoordinates(primaryListing.latitude, primaryListing.longitude, primaryListing.slug),
                  label: primaryListing.title,
                }
              : null
          }
          allExperiences={allExperiences}
        />

        <SectionBlogHighlights />

        <SectionFaqHighlights />
      </div>
    </main>
  );
}

export default PageHome;
