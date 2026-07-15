"use client";

import React, { useEffect, useRef, useState } from "react";
import { PathName } from "@/routers/types";
import Header from "./Header";
import { usePathname } from "next/navigation";

let OPTIONS = {
  root: null,
  rootMargin: "0px",
  threshold: 1.0,
};
let OBSERVER: IntersectionObserver | null = null;
const PAGES_HIDE_HEADER_BORDER: PathName[] = [
  "/listing-stay-detail" as PathName,
];

const SiteHeader = () => {
  const anchorRef = useRef<HTMLDivElement>(null);
  const [isTopOfPage, setIsTopOfPage] = useState(true);

  useEffect(() => {
    setIsTopOfPage(window.pageYOffset < 5);
  }, []);

  const pathname = usePathname();

  const intersectionCallback = (entries: IntersectionObserverEntry[]) => {
    entries.forEach((entry) => {
      setIsTopOfPage(entry.isIntersecting);
    });
  };

  useEffect(() => {
    if (!PAGES_HIDE_HEADER_BORDER.includes(pathname as PathName)) {
      OBSERVER && OBSERVER.disconnect();
      OBSERVER = null;
      return;
    }
    if (!OBSERVER) {
      OBSERVER = new IntersectionObserver(intersectionCallback, OPTIONS);
      anchorRef.current && OBSERVER.observe(anchorRef.current);
    }
  }, [pathname]);

  const headerClassName = PAGES_HIDE_HEADER_BORDER.includes(
    pathname as PathName
  )
    ? isTopOfPage
      ? ""
      : "shadow-sm dark:border-b dark:border-neutral-700"
    : "shadow-sm dark:border-b dark:border-neutral-700";

  return (
    <>
      <Header className={headerClassName} navType="MainNav1" />
      <div ref={anchorRef} className="h-1 absolute invisible"></div>
    </>
  );
};

export default SiteHeader;
