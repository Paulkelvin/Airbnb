import React from "react";
import SectionHero from "@/app/(server-components)/SectionHero";
import BgGlassmorphism from "@/components/BgGlassmorphism";
import SectionSliderNewCategories from "@/components/SectionSliderNewCategories";
import BackgroundSection from "@/components/BackgroundSection";
import { TaxonomyType } from "@/data/types";

const STAY_TYPES: TaxonomyType[] = [
  {
    id: "st1",
    href: "/listing-stay",
    name: "Apartments",
    taxonomy: "category",
    count: 120,
    thumbnail:
      "https://images.pexels.com/photos/1918291/pexels-photo-1918291.jpeg?auto=compress&cs=tinysrgb&w=600",
  },
  {
    id: "st2",
    href: "/listing-stay",
    name: "Houses",
    taxonomy: "category",
    count: 95,
    thumbnail:
      "https://images.pexels.com/photos/106399/pexels-photo-106399.jpeg?auto=compress&cs=tinysrgb&w=600",
  },
  {
    id: "st3",
    href: "/listing-stay",
    name: "Villas",
    taxonomy: "category",
    count: 45,
    thumbnail:
      "https://images.pexels.com/photos/2102587/pexels-photo-2102587.jpeg?auto=compress&cs=tinysrgb&w=600",
  },
  {
    id: "st4",
    href: "/listing-stay",
    name: "Cabins",
    taxonomy: "category",
    count: 68,
    thumbnail:
      "https://images.pexels.com/photos/2351649/pexels-photo-2351649.jpeg?auto=compress&cs=tinysrgb&w=600",
  },
  {
    id: "st5",
    href: "/listing-stay",
    name: "Cottages",
    taxonomy: "category",
    count: 55,
    thumbnail:
      "https://images.pexels.com/photos/323780/pexels-photo-323780.jpeg?auto=compress&cs=tinysrgb&w=600",
  },
  {
    id: "st6",
    href: "/listing-stay",
    name: "Lofts",
    taxonomy: "category",
    count: 38,
    thumbnail:
      "https://images.pexels.com/photos/2119714/pexels-photo-2119714.jpeg?auto=compress&cs=tinysrgb&w=600",
  },
  {
    id: "st7",
    href: "/listing-stay",
    name: "Penthouses",
    taxonomy: "category",
    count: 22,
    thumbnail:
      "https://images.pexels.com/photos/2724749/pexels-photo-2724749.jpeg?auto=compress&cs=tinysrgb&w=600",
  },
  {
    id: "st8",
    href: "/listing-stay",
    name: "Farmhouses",
    taxonomy: "category",
    count: 30,
    thumbnail:
      "https://images.pexels.com/photos/2440471/pexels-photo-2440471.jpeg?auto=compress&cs=tinysrgb&w=600",
  },
];

function PageHome() {
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

        <SectionSliderNewCategories
          heading="Explore by types of stays"
          subHeading="Find the style that suits your trip"
          categories={STAY_TYPES}
          itemPerRow={4}
        />
      </div>
    </main>
  );
}

export default PageHome;
