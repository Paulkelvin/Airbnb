"use client";

import Logo from "@/components/ui/Logo";
import SocialsList from "@/components/ui/SocialsList";
import { CustomLink } from "@/data/types";
import React from "react";

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
      { href: "/listing-stay", label: "Browse listings" },
      { href: "/listing-stay-map", label: "Map view" },
      { href: "/blog", label: "Blog" },
      { href: "/about", label: "About us" },
    ],
  },
  {
    id: "2",
    title: "Hosting",
    menus: [
      { href: "/add-listing/1", label: "List your property" },
      { href: "/help", label: "Help center" },
      { href: "/contact", label: "Contact us" },
    ],
  },
  {
    id: "3",
    title: "Support",
    menus: [
      { href: "/help", label: "Help & FAQ" },
      { href: "/contact", label: "Contact support" },
    ],
  },
  {
    id: "4",
    title: "Legal",
    menus: [
      { href: "/privacy", label: "Privacy policy" },
      { href: "/terms", label: "Terms of service" },
    ],
  },
];

const Footer: React.FC = () => {
  const renderWidgetMenuItem = (menu: WidgetFooterMenu, index: number) => {
    return (
      <div key={index} className="text-sm">
        <h2 className="font-semibold text-neutral-700 dark:text-neutral-200">
          {menu.title}
        </h2>
        <ul className="mt-5 space-y-4">
          {menu.menus.map((item, index) => (
            <li key={index}>
              <a
                key={index}
                className="text-neutral-6000 dark:text-neutral-300 hover:text-black dark:hover:text-white"
                href={item.href}
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  return (
    <>
      <div className="nc-Footer relative py-16 lg:py-20 border-t border-neutral-200 dark:border-neutral-700">
        <div className="container grid grid-cols-2 gap-y-10 gap-x-5 sm:gap-x-8 md:grid-cols-4 lg:grid-cols-5 lg:gap-x-10 ">
          <div className="grid grid-cols-4 gap-5 col-span-2 md:col-span-4 lg:md:col-span-1 lg:flex lg:flex-col">
            <div className="col-span-2 md:col-span-1">
              <Logo />
            </div>
            <div className="col-span-2 flex items-center md:col-span-3">
              <SocialsList className="flex items-center space-x-3 lg:space-x-0 lg:flex-col lg:space-y-2.5 lg:items-start" />
            </div>
          </div>
          {widgetMenus.map(renderWidgetMenuItem)}
        </div>
      </div>
    </>
  );
};

export default Footer;
