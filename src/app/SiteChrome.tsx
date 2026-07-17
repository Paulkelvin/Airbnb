"use client";

import { usePathname } from "next/navigation";
import React from "react";

export default function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname?.startsWith("/admin") || pathname?.startsWith("/studio")) return null;
  return <>{children}</>;
}
