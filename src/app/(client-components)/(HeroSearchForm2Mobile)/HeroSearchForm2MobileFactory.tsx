"use client";

import React, { useEffect, useState } from "react";
import HeroSearchForm2Mobile from "./HeroSearchForm2Mobile";
import type { Route } from "@/routers/types";

const HeroSearchForm2MobileFactory = () => {
  const [listingHref, setListingHref] = useState<Route | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/listings/primary")
      .then((res) => res.json())
      .then((data: { slug: string | null }) => {
        if (!cancelled && data.slug) {
          setListingHref(`/listing-stay-detail/${data.slug}` as Route);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return <HeroSearchForm2Mobile listingHref={listingHref} />;
};

export default HeroSearchForm2MobileFactory;
