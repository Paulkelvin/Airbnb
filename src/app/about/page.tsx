import React from "react";
import BgGlassmorphism from "@/components/BgGlassmorphism";

export const metadata = {
  title: "About Us",
};

const PageAbout: React.FC = () => {
  return (
    <div className="nc-PageAbout overflow-hidden relative">
      <BgGlassmorphism />
      <div className="container py-16 lg:py-28 space-y-16 lg:space-y-28">
        <div className="max-w-3xl">
          <h2 className="text-3xl md:text-4xl font-semibold">About Us</h2>
          <span className="block mt-3 text-neutral-500 dark:text-neutral-400">
            Learn more about our platform and mission.
          </span>
          <div className="w-14 border-b border-neutral-200 dark:border-neutral-700 mt-6 mb-10"></div>
          <p className="text-neutral-500 dark:text-neutral-400">
            Platform story and team information coming soon.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PageAbout;
