"use client";

import { Route } from "@/routers/types";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";
import { useSession } from "next-auth/react";

const LABELS: Record<string, string> = {
  "/account": "Profile",
  "/account-bookings": "Trips",
  "/account-messages": "Messages",
  "/account-listings": "Listings",
  "/account-savelists": "Saved",
  "/account-notifications": "Notifications",
  "/account-password": "Security",
  "/account-billing": "Payments",
};

export const Nav = () => {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isAdmin = session?.user.roles?.includes("ADMIN");

  // Marketplace mode is off: "Listings" and "Payments" (host payout
  // onboarding) are ADMIN-only capabilities, so hide those tabs for
  // everyone else. The underlying pages redirect non-admins regardless.
  const allNav: Route[] = [
    "/account",
    "/account-bookings",
    "/account-messages",
    "/account-listings",
    "/account-savelists",
    "/account-notifications",
    "/account-password",
    "/account-billing",
  ];
  const adminOnlyNav = new Set(["/account-listings", "/account-billing", "/account-savelists"]);
  const listNav = isAdmin ? allNav : allNav.filter((item) => !adminOnlyNav.has(item));

  return (
    <div className="container">
      <div className="flex space-x-8 md:space-x-14 overflow-x-auto hiddenScrollbar">
        {listNav.map((item) => {
          const isActive = pathname === item;
          return (
            <Link
              key={item}
              href={item}
              className={`block py-5 md:py-8 border-b-2 flex-shrink-0 ${
                isActive
                  ? "border-primary-500 font-medium"
                  : "border-transparent"
              }`}
            >
              {LABELS[item] ?? item}
            </Link>
          );
        })}
      </div>
    </div>
  );
};
