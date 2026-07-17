import BgGlassmorphism from "@/components/BgGlassmorphism";
import React, { ReactNode } from "react";

const Layout = ({ children }: { children: ReactNode }) => {
  return (
    <div className={`nc-ListingStayPage relative`}>
      <BgGlassmorphism />

      <div className="container pt-10 pb-24 lg:pt-16 lg:pb-28">
        <h1 className="text-3xl font-semibold">Find Your Next Stay</h1>
        <p className="mt-2 text-neutral-500 dark:text-neutral-400">
          Search verified properties across top U.S. cities
        </p>
      </div>

      {children}
    </div>
  );
};

export default Layout;
