"use client";

import React, { FC, useEffect, useRef, useState } from "react";
import { TaxonomyType } from "@/data/types";
import CardCategoryBox1 from "@/components/CardCategoryBox1";
import Heading from "@/components/ui/Heading";
import PrevBtn from "./PrevBtn";
import NextBtn from "./NextBtn";

export interface SectionSliderNewCategoriesProps {
  className?: string;
  itemClassName?: string;
  heading?: string;
  subHeading?: string;
  categories?: TaxonomyType[];
  itemPerRow?: 4 | 5;
  sliderStyle?: "style1" | "style2";
}

const DEMO_CATS: TaxonomyType[] = [
  {
    id: "1",
    href: "/listing-stay-map",
    name: "New York",
    taxonomy: "category",
    count: 320,
    thumbnail:
      "https://images.pexels.com/photos/2190283/pexels-photo-2190283.jpeg?auto=compress&cs=tinysrgb&w=600",
  },
  {
    id: "2",
    href: "/listing-stay-map",
    name: "Miami",
    taxonomy: "category",
    count: 215,
    thumbnail:
      "https://images.pexels.com/photos/3601425/pexels-photo-3601425.jpeg?auto=compress&cs=tinysrgb&w=600",
  },
  {
    id: "3",
    href: "/listing-stay-map",
    name: "Los Angeles",
    taxonomy: "category",
    count: 280,
    thumbnail:
      "https://images.pexels.com/photos/2695679/pexels-photo-2695679.jpeg?auto=compress&cs=tinysrgb&w=600",
  },
  {
    id: "4",
    href: "/listing-stay-map",
    name: "Chicago",
    taxonomy: "category",
    count: 175,
    thumbnail:
      "https://images.pexels.com/photos/1769370/pexels-photo-1769370.jpeg?auto=compress&cs=tinysrgb&w=600",
  },
  {
    id: "5",
    href: "/listing-stay-map",
    name: "San Diego",
    taxonomy: "category",
    count: 140,
    thumbnail:
      "https://images.pexels.com/photos/2476632/pexels-photo-2476632.jpeg?auto=compress&cs=tinysrgb&w=600",
  },
  {
    id: "6",
    href: "/listing-stay-map",
    name: "Austin",
    taxonomy: "category",
    count: 195,
    thumbnail:
      "https://images.pexels.com/photos/1563256/pexels-photo-1563256.jpeg?auto=compress&cs=tinysrgb&w=600",
  },
  {
    id: "7",
    href: "/listing-stay-map",
    name: "Denver",
    taxonomy: "category",
    count: 130,
    thumbnail:
      "https://images.pexels.com/photos/2706750/pexels-photo-2706750.jpeg?auto=compress&cs=tinysrgb&w=600",
  },
  {
    id: "8",
    href: "/listing-stay-map",
    name: "Charleston",
    taxonomy: "category",
    count: 95,
    thumbnail:
      "https://images.pexels.com/photos/3935350/pexels-photo-3935350.jpeg?auto=compress&cs=tinysrgb&w=600",
  },
];

const SectionSliderNewCategories: FC<SectionSliderNewCategoriesProps> = ({
  heading = "Suggestions for discovery",
  subHeading = "Popular places recommended for you",
  className = "",
  itemClassName = "",
  categories = DEMO_CATS,
  itemPerRow = 5,
  sliderStyle = "style1",
}) => {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(true);

  const updateScrollState = () => {
    const el = scrollerRef.current;
    if (!el) return;
    setCanPrev(el.scrollLeft > 8);
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
  };

  useEffect(() => {
    updateScrollState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories]);

  const scrollByAmount = (dir: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>("[data-slide]");
    const amount = (card?.offsetWidth ?? el.clientWidth * 0.8) + 16;
    el.scrollBy({ left: dir * amount, behavior: "smooth" });
  };

  // Cards are sized as a fraction of the viewport (not an even 1/n grid) so
  // the next card visibly "bleeds" in from the edge, inviting a swipe/scroll
  // — matching the peek-carousel pattern instead of a full-page-per-view slider.
  const widthClass =
    itemPerRow === 4
      ? "w-[72%] sm:w-[45%] md:w-[32%] lg:w-[24%]"
      : "w-[72%] sm:w-[45%] md:w-[32%] lg:w-[19%] xl:w-[18%]";

  return (
    <div className={`nc-SectionSliderNewCategories ${className}`}>
      <Heading desc={subHeading} isCenter={sliderStyle === "style2"}>
        {heading}
      </Heading>
      <div className="relative flow-root">
        <div
          ref={scrollerRef}
          onScroll={updateScrollState}
          className="no-scrollbar flex gap-4 xl:gap-6 overflow-x-auto snap-x snap-mandatory scroll-smooth -mx-4 px-4 sm:-mx-2 sm:px-2"
        >
          {categories.map((item, indx) => (
            <div
              data-slide
              key={indx}
              className={`flex-none snap-start ${widthClass} ${itemClassName}`}
            >
              <CardCategoryBox1 taxonomy={item} />
            </div>
          ))}
        </div>

        {canPrev && (
          <PrevBtn
            onClick={() => scrollByAmount(-1)}
            className="hidden md:inline-flex w-10 h-10 xl:w-12 xl:h-12 text-lg absolute -left-3 xl:-left-6 top-1/3 -translate-y-1/2 z-[1]"
          />
        )}
        {canNext && (
          <NextBtn
            onClick={() => scrollByAmount(1)}
            className="hidden md:inline-flex w-10 h-10 xl:w-12 xl:h-12 text-lg absolute -right-3 xl:-right-6 top-1/3 -translate-y-1/2 z-[1]"
          />
        )}
      </div>
    </div>
  );
};

export default SectionSliderNewCategories;
