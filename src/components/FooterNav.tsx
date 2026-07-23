"use client";

import {
  HomeIcon,
  MapPinIcon,
  UserCircleIcon,
} from "@heroicons/react/24/outline";
import React, { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { PathName } from "@/routers/types";
import MenuBar from "@/components/ui/MenuBar";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItem {
  name: string;
  link?: PathName;
  icon: any;
}

// One property, so "Explore"/magnifying-glass (search listings) and
// "Wishlists" (save several properties to compare) no longer fit — this is
// just Home plus a direct link to the actual new discovery feature.
const NAV_LOGGED_OUT: NavItem[] = [
  {
    name: "Home",
    link: "/",
    icon: HomeIcon,
  },
  {
    name: "Explore Area",
    link: "/explore-the-area",
    icon: MapPinIcon,
  },
  {
    name: "Log in",
    link: "/login",
    icon: UserCircleIcon,
  },
  {
    name: "Menu",
    icon: MenuBar,
  },
];

const NAV_LOGGED_IN: NavItem[] = [
  {
    name: "Home",
    link: "/",
    icon: HomeIcon,
  },
  {
    name: "Explore Area",
    link: "/explore-the-area",
    icon: MapPinIcon,
  },
  {
    name: "Account",
    link: "/account",
    icon: UserCircleIcon,
  },
  {
    name: "Menu",
    icon: MenuBar,
  },
];

const FooterNav = () => {
  const { status } = useSession();
  const navRef = useRef<HTMLElement>(null);

  const pathname = usePathname();
  const NAV = status === "authenticated" ? NAV_LOGGED_IN : NAV_LOGGED_OUT;
  const isListingDetail = pathname.startsWith("/listing-stay-detail");

  // `position: fixed; bottom: 0` anchors to the layout viewport, which mobile
  // Chrome resizes as its own address bar auto-hides/shows on scroll — so the
  // nav visibly jumps a beat behind the real screen edge. The visualViewport
  // tracks what's actually on screen, so we translate the nav to close that
  // gap and keep it glued to the true bottom edge either way.
  useEffect(() => {
    const vv = window.visualViewport;
    const nav = navRef.current;
    if (!vv || !nav) return;

    const reposition = () => {
      const offset = window.innerHeight - (vv.height + vv.offsetTop);
      nav.style.transform = offset > 0 ? `translateY(-${offset}px)` : "";
    };

    vv.addEventListener("resize", reposition);
    vv.addEventListener("scroll", reposition);
    reposition();

    return () => {
      vv.removeEventListener("resize", reposition);
      vv.removeEventListener("scroll", reposition);
    };
  }, []);

  if (isListingDetail) {
    return null;
  }

  const renderItem = (item: NavItem, index: number) => {
    const isActive = pathname === item.link;

    return item.link ? (
      <Link
        key={index}
        href={item.link}
        aria-current={isActive ? "page" : undefined}
        className={`flex flex-col items-center justify-between text-neutral-500 dark:text-neutral-300/90 ${
          isActive ? "text-neutral-900 dark:text-neutral-100" : ""
        }`}
      >
        <item.icon className={`w-6 h-6 ${isActive ? "text-red-600" : ""}`} />
        <span
          className={`text-[11px] leading-none mt-1 ${
            isActive ? "text-red-600" : ""
          }`}
        >
          {item.name}
        </span>
      </Link>
    ) : (
      <div
        key={index}
        className={`flex flex-col items-center justify-between text-neutral-500 dark:text-neutral-300/90 ${
          isActive ? "text-neutral-900 dark:text-neutral-100" : ""
        }`}
      >
        <item.icon iconClassName="w-6 h-6" className={``} />
        <span className="text-[11px] leading-none mt-1">{item.name}</span>
      </div>
    );
  };

  return (
    <nav
      ref={navRef}
      aria-label="Mobile navigation"
      className="FooterNav block md:!hidden p-2 bg-white dark:bg-neutral-800 fixed top-auto bottom-0 inset-x-0 z-30 border-t border-neutral-300 dark:border-neutral-700"
    >
      <div className="w-full max-w-lg flex justify-around mx-auto text-sm text-center ">
        {/* MENU */}
        {NAV.map(renderItem)}
      </div>
    </nav>
  );
};

export default FooterNav;

