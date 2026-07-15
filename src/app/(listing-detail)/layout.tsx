"use client";

import React, { ReactNode } from "react";
import MobileFooterSticky from "./(components)/MobileFooterSticky";

// The photo-tour modal is now rendered per-listing inside the detail page
// itself (each listing has its own images) rather than globally here.
const DetailtLayout = ({ children }: { children: ReactNode }) => {
  return (
    <div className="ListingDetailPage">
      <div className="container ListingDetailPage__content">{children}</div>

      <MobileFooterSticky />
    </div>
  );
};

export default DetailtLayout;
