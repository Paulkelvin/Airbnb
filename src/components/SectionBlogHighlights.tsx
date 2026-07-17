import React from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRightIcon } from "@heroicons/react/24/outline";
import Heading from "@/components/ui/Heading";
import { blogPosts } from "@/data/blogPosts";
import type { Route } from "@/routers/types";

const BLOG_HREF = "/blog" as Route;

const SectionBlogHighlights: React.FC = () => {
  const posts = blogPosts.slice(0, 3);

  return (
    <div className="nc-SectionBlogHighlights">
      <div className="flex items-center justify-between">
        <Heading desc="Tips, guides, and stories for guests and hosts">
          Latest stories
        </Heading>
        <Link
          href={BLOG_HREF}
          className="hidden sm:inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full border border-neutral-200 dark:border-neutral-700 text-sm font-medium hover:border-neutral-400 dark:hover:border-neutral-500 transition-colors mb-10"
        >
          See more
          <ArrowRightIcon className="w-4 h-4" />
        </Link>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
        {posts.map((post) => (
          <Link
            key={post.slug}
            href={`/blog/${post.slug}` as Route}
            className="group block rounded-2xl border border-neutral-200 dark:border-neutral-700 overflow-hidden hover:shadow-lg dark:hover:border-neutral-600 transition-shadow duration-300"
          >
            <div className="relative aspect-[16/10] overflow-hidden">
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
            <div className="p-4">
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

      <div className="flex sm:hidden justify-center mt-10">
        <Link
          href={BLOG_HREF}
          className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full border border-neutral-200 dark:border-neutral-700 text-sm font-medium hover:border-neutral-400 dark:hover:border-neutral-500 transition-colors"
        >
          See more
          <ArrowRightIcon className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
};

export default SectionBlogHighlights;
