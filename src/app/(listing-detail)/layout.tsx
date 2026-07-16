"use client";

import React, { ReactNode } from "react";

// The photo-tour modal is now rendered per-listing inside the detail page
// itself (each listing has its own images) rather than globally here. The
// mobile sticky booking bar is likewise rendered per-listing now
// (ListingDetailView.tsx's MobileBookingBar) since it needs the real
// listing's price/pricing data, which a layout has no access to — the old
// MobileFooterSticky rendered here showed a hardcoded fake price and opened
// a demo checkout screen disconnected from the real booking actions.
const DetailtLayout = ({ children }: { children: ReactNode }) => {
  return (
    <div className="ListingDetailPage">
      <div className="container ListingDetailPage__content">{children}</div>
    </div>
  );
};

export default DetailtLayout;
