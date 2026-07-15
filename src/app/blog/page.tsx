import React from "react";
import BgGlassmorphism from "@/components/BgGlassmorphism";

export const metadata = {
  title: "Blog",
};

const BlogPage: React.FC = () => {
  return (
    <div className="nc-BlogPage overflow-hidden relative">
      <BgGlassmorphism />
      <div className="container relative py-16 lg:py-28">
        <h2 className="text-3xl md:text-4xl font-semibold">Blog</h2>
        <span className="block mt-3 text-neutral-500 dark:text-neutral-400">
          Insights, tips, and stories about finding your perfect stay.
        </span>
        <div className="w-14 border-b border-neutral-200 dark:border-neutral-700 mt-6 mb-10"></div>
        <p className="text-neutral-500 dark:text-neutral-400">
          Blog content coming soon.
        </p>
      </div>
    </div>
  );
};

export default BlogPage;
