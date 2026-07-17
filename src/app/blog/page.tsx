import React from "react";
import BgGlassmorphism from "@/components/BgGlassmorphism";
import Image from "next/image";
import Link from "next/link";
import { blogPosts } from "@/data/blogPosts";

export const metadata = {
  title: "Blog",
  description: "Travel tips, hosting advice, and destination guides from the Potomac team.",
};

const BlogPage: React.FC = () => {
  return (
    <div className="nc-BlogPage overflow-hidden relative">
      <BgGlassmorphism />
      <div className="container relative py-16 lg:py-28">
        <h2 className="text-3xl md:text-4xl font-semibold">Stories &amp; Guides</h2>
        <span className="block mt-3 text-neutral-500 dark:text-neutral-400 text-lg">
          Insights, tips, and stories about finding your perfect stay.
        </span>
        <div className="w-14 border-b border-neutral-200 dark:border-neutral-700 mt-6 mb-10"></div>

        {/* Featured post */}
        <Link href={`/blog/${blogPosts[0].slug}`} className="block group">
          <div className="grid lg:grid-cols-2 gap-6 lg:gap-10">
            <div className="relative aspect-[16/10] rounded-2xl overflow-hidden">
              <Image
                src={blogPosts[0].image}
                fill
                alt={blogPosts[0].title}
                className="object-cover group-hover:scale-105 transition-transform duration-300"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
              <span className="absolute top-4 left-4 px-3 py-1 bg-white/90 dark:bg-neutral-800/90 rounded-full text-xs font-medium">
                {blogPosts[0].category}
              </span>
            </div>
            <div className="flex flex-col justify-center">
              <span className="text-sm text-neutral-500 dark:text-neutral-400">
                {blogPosts[0].date} &middot; {blogPosts[0].readTime}
              </span>
              <h3 className="text-2xl md:text-3xl font-semibold mt-2 group-hover:text-primary-600 transition-colors">
                {blogPosts[0].title}
              </h3>
              <p className="mt-3 text-neutral-500 dark:text-neutral-400 leading-relaxed">
                {blogPosts[0].excerpt}
              </p>
              <span className="mt-4 text-primary-600 font-medium">
                Read more &rarr;
              </span>
            </div>
          </div>
        </Link>

        {/* Grid of remaining posts */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 mt-16">
          {blogPosts.slice(1).map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="group block"
            >
              <div className="relative aspect-[16/10] rounded-2xl overflow-hidden">
                <Image
                  src={post.image}
                  fill
                  alt={post.title}
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
                <span className="absolute top-3 left-3 px-3 py-1 bg-white/90 dark:bg-neutral-800/90 rounded-full text-xs font-medium">
                  {post.category}
                </span>
              </div>
              <div className="mt-4">
                <span className="text-xs text-neutral-500 dark:text-neutral-400">
                  {post.date} &middot; {post.readTime}
                </span>
                <h4 className="text-lg font-semibold mt-1 group-hover:text-primary-600 transition-colors line-clamp-2">
                  {post.title}
                </h4>
                <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400 line-clamp-2">
                  {post.excerpt}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BlogPage;
