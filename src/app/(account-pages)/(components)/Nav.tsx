"use client";

import { Route } from "@/routers/types";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";

export const Nav = () => {
  const pathname = usePathname();

  const listNav: Route[] = [
    "/account",
    "/account-bookings",
    "/account-messages",
    "/account-listings",
    "/account-savelists",
    "/account-notifications",
    "/account-password",
    "/account-billing",
  ];
  const labels: Record<Route, string> = {
    "/account": "Profile",
    "/account-bookings": "Trips",
    "/account-messages": "Messages",
    "/account-listings": "Listings",
    "/account-savelists": "Saved",
    "/account-notifications": "Notifications",
    "/account-password": "Security",
    "/account-billing": "Payments",
  };

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
              {labels[item]}
            </Link>
          );
        })}
      </div>
    </div>
  );
};
