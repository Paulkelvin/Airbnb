import React from "react";
import BgGlassmorphism from "@/components/BgGlassmorphism";

const BlogPostPage = ({ params }: { params: { slug: string } }) => {
  return (
    <div className="nc-BlogPostPage overflow-hidden relative">
      <BgGlassmorphism />
      <div className="container relative py-16 lg:py-28">
        <article className="max-w-3xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-semibold">Blog Post</h1>
          <div className="w-14 border-b border-neutral-200 dark:border-neutral-700 mt-6 mb-10"></div>
          <p className="text-neutral-500 dark:text-neutral-400">
            Blog post content will be loaded here.
          </p>
        </article>
      </div>
    </div>
  );
};

export default BlogPostPage;
