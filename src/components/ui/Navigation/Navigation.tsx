"use client";

import React from "react";
import { useSession } from "next-auth/react";
import NavigationItem from "./NavigationItem";
import { NAVIGATION_DEMO } from "@/data/navigation";

function Navigation() {
  const { data: session } = useSession();
  const isAdmin = session?.user.roles?.includes("ADMIN");
  // Marketplace mode is off: hide the host-facing "List Your Space" item
  // from everyone but ADMIN. Server-side gates on the underlying routes
  // remain the actual source of truth — this is just UI polish.
  const items = isAdmin
    ? NAVIGATION_DEMO
    : NAVIGATION_DEMO.filter((item) => item.href !== "/add-listing");

  return (
    <ul className="nc-Navigation hidden lg:flex lg:flex-wrap lg:space-x-1 relative">
      {items.map((item) => (
        <NavigationItem key={item.id} menuItem={item} />
      ))}
    </ul>
  );
}

export default Navigation;
