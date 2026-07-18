"use client";

import Logo from "@/components/ui/Logo";
import SocialsList from "@/components/ui/SocialsList";
import { CustomLink } from "@/data/types";
import { Route } from "@/routers/types";
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";

export interface WidgetFooterMenu {
  id: string;
  title: string;
  menus: CustomLink[];
}

const widgetMenus: WidgetFooterMenu[] = [
  {
    id: "1",
    title: "Explore",
    menus: [
      { href: "/listing-stay", label: "Browse stays" },
      { href: "/listing-stay-map", label: "Map view" },
      { href: "/blog", label: "Stories & guides" },
      { href: "/about", label: "About us" },
    ],
  },
  {
    id: "2",
    title: "Support",
    menus: [
      { href: "/faq", label: "Help centre" },
      { href: "/contact", label: "Contact us" },
    ],
  },
  {
    id: "3",
    title: "Legal",
    menus: [
      { href: "/privacy", label: "Privacy policy" },
      { href: "/terms", label: "Terms of service" },
    ],
  },
];

const Footer: React.FC = () => {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isAdmin = session?.user.roles?.includes("ADMIN");
  // MobileBookingBar (listing-stay-detail pages) is a taller fixed bottom
  // bar than the site's usual FooterNav — pad the footer so its own fixed
  // bar doesn't sit on top of the Legal/Explore links on small screens.
  const isListingDetail = pathname.startsWith("/listing-stay-detail");

  // Marketplace mode is off: "List your space" is an ADMIN-only capability,
  // so it's added back into the Support column only for admins rather than
  // shown to every visitor.
  const menus = isAdmin
    ? widgetMenus.map((menu) =>
        menu.id === "2"
          ? { ...menu, menus: [{ href: "/add-listing", label: "List your space" }, ...menu.menus] }
          : menu,
      )
    : widgetMenus;

  const renderWidgetMenuItem = (menu: WidgetFooterMenu, index: number) => {
    return (
      <div key={index} className="text-sm">
        <h3 className="font-semibold text-neutral-700 dark:text-neutral-200">
          {menu.title}
        </h3>
        <ul className="mt-5 space-y-4">
          {menu.menus.map((item, index) => (
            <li key={index}>
              <Link
                key={index}
                className="text-neutral-6000 dark:text-neutral-300 hover:text-black dark:hover:text-white"
                href={item.href as Route}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  return (
    <>
      <div
        className={`nc-Footer relative py-16 lg:py-20 border-t border-neutral-200 dark:border-neutral-700 ${
          isListingDetail ? "pb-28 lg:pb-20" : ""
        }`}
      >
        <div className="container grid grid-cols-2 gap-y-10 gap-x-5 sm:gap-x-8 md:grid-cols-4 lg:grid-cols-4 lg:gap-x-10 ">
          <div className="grid grid-cols-4 gap-5 col-span-2 md:col-span-4 lg:md:col-span-1 lg:flex lg:flex-col">
            <div className="col-span-2 md:col-span-1">
              <Logo />
            </div>
            <div className="col-span-2 flex items-center md:col-span-3">
              <SocialsList className="flex items-center space-x-3 lg:space-x-0 lg:flex-col lg:space-y-2.5 lg:items-start" />
            </div>
          </div>
          {menus.map(renderWidgetMenuItem)}
        </div>
      </div>
    </>
  );
};

export default Footer;
