import React from "react";
import { Metadata } from "next";
import BgGlassmorphism from "@/components/BgGlassmorphism";
import Image from "next/image";
import Link from "next/link";
import { sanityClient } from "@/lib/sanity/client";
import { urlFor } from "@/lib/sanity/client";
import { allPostsQuery } from "@/lib/sanity/queries";
import { blogPosts } from "@/data/blogPosts";
import { getSiteUrl } from "@/lib/site-url";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Travel tips, hosting advice, and destination guides from the Potomac team.",
  alternates: { canonical: `${getSiteUrl()}/blog` },
  openGraph: {
    title: "Blog | Potomac",
    description:
      "Travel tips, hosting advice, and destination guides from the Potomac team.",
    url: `${getSiteUrl()}/blog`,
    type: "website",
  },
};

interface SanityPost {
  _id: string;
  title: string;
  slug: { current: string };
  excerpt?: string;
  publishedAt: string;
  mainImage?: any;
  categories?: { title: string; slug: { current: string } }[];
  author?: { name: string; slug: { current: string }; image?: any };
  estimatedReadingTime?: number;
}

async function getPosts(): Promise<SanityPost[] | null> {
  if (!process.env.NEXT_PUBLIC_SANITY_PROJECT_ID) return null;
  try {
    return await sanityClient.fetch<SanityPost[]>(allPostsQuery);
  } catch {
    return null;
  }
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function PostCard({
  slug,
  title,
  excerpt,
  category,
  date,
  readTime,
  imageUrl,
}: {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  date: string;
  readTime: string;
  imageUrl: string;
}) {
  return (
    <Link href={`/blog/${slug}`} className="group block">
      <div className="relative aspect-[16/10] rounded-2xl overflow-hidden">
        <Image
          src={imageUrl}
          fill
          alt={title}
          className="object-cover group-hover:scale-105 transition-transform duration-300"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />
        <span className="absolute top-3 left-3 px-3 py-1 bg-white/90 dark:bg-neutral-800/90 rounded-full text-xs font-medium">
          {category}
        </span>
      </div>
      <div className="mt-4">
        <span className="text-xs text-neutral-500 dark:text-neutral-400">
          {date} &middot; {readTime}
        </span>
        <h4 className="text-lg font-semibold mt-1 group-hover:text-primary-600 transition-colors line-clamp-2">
          {title}
        </h4>
        <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400 line-clamp-2">
          {excerpt}
        </p>
      </div>
    </Link>
  );
}

export default async function BlogPage() {
  const sanityPosts = await getPosts();

  if (sanityPosts && sanityPosts.length > 0) {
    const featured = sanityPosts[0];
    const rest = sanityPosts.slice(1);
    const featuredImage = featured.mainImage
      ? urlFor(featured.mainImage).width(1200).quality(85).url()
      : "https://images.pexels.com/photos/1643383/pexels-photo-1643383.jpeg?auto=compress&cs=tinysrgb&w=1260";

    return (
      <div className="nc-BlogPage overflow-hidden relative">
        <BgGlassmorphism />
        <div className="container relative py-16 lg:py-28">
          <h1 className="text-3xl md:text-4xl font-semibold">Blog</h1>
          <p className="block mt-3 text-neutral-500 dark:text-neutral-400 text-lg">
            Insights, tips, and stories about finding your perfect stay.
          </p>
          <div className="w-14 border-b border-neutral-200 dark:border-neutral-700 mt-6 mb-10" />

          <Link href={`/blog/${featured.slug.current}`} className="block group">
            <div className="grid lg:grid-cols-2 gap-6 lg:gap-10">
              <div className="relative aspect-[16/10] rounded-2xl overflow-hidden">
                <Image
                  src={featuredImage}
                  fill
                  alt={featured.mainImage?.alt || featured.title}
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
                {featured.categories?.[0] && (
                  <span className="absolute top-4 left-4 px-3 py-1 bg-white/90 dark:bg-neutral-800/90 rounded-full text-xs font-medium">
                    {featured.categories[0].title}
                  </span>
                )}
              </div>
              <div className="flex flex-col justify-center">
                <span className="text-sm text-neutral-500 dark:text-neutral-400">
                  {formatDate(featured.publishedAt)}
                  {featured.estimatedReadingTime
                    ? ` · ${featured.estimatedReadingTime} min read`
                    : ""}
                </span>
                <h2 className="text-2xl md:text-3xl font-semibold mt-2 group-hover:text-primary-600 transition-colors">
                  {featured.title}
                </h2>
                {featured.excerpt && (
                  <p className="mt-3 text-neutral-500 dark:text-neutral-400 leading-relaxed">
                    {featured.excerpt}
                  </p>
                )}
                <span className="mt-4 text-primary-600 font-medium">
                  Read more &rarr;
                </span>
              </div>
            </div>
          </Link>

          {rest.length > 0 && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 mt-16">
              {rest.map((post) => (
                <PostCard
                  key={post._id}
                  slug={post.slug.current}
                  title={post.title}
                  excerpt={post.excerpt || ""}
                  category={post.categories?.[0]?.title || "General"}
                  date={formatDate(post.publishedAt)}
                  readTime={
                    post.estimatedReadingTime
                      ? `${post.estimatedReadingTime} min read`
                      : "5 min read"
                  }
                  imageUrl={
                    post.mainImage
                      ? urlFor(post.mainImage).width(800).quality(80).url()
                      : "https://images.pexels.com/photos/1643383/pexels-photo-1643383.jpeg?auto=compress&cs=tinysrgb&w=800"
                  }
                />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Fallback: hardcoded posts when Sanity isn't configured
  return (
    <div className="nc-BlogPage overflow-hidden relative">
      <BgGlassmorphism />
      <div className="container relative py-16 lg:py-28">
        <h1 className="text-3xl md:text-4xl font-semibold">Blog</h1>
        <p className="block mt-3 text-neutral-500 dark:text-neutral-400 text-lg">
          Insights, tips, and stories about finding your perfect stay.
        </p>
        <div className="w-14 border-b border-neutral-200 dark:border-neutral-700 mt-6 mb-10" />

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
              <h2 className="text-2xl md:text-3xl font-semibold mt-2 group-hover:text-primary-600 transition-colors">
                {blogPosts[0].title}
              </h2>
              <p className="mt-3 text-neutral-500 dark:text-neutral-400 leading-relaxed">
                {blogPosts[0].excerpt}
              </p>
              <span className="mt-4 text-primary-600 font-medium">
                Read more &rarr;
              </span>
            </div>
          </div>
        </Link>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 mt-16">
          {blogPosts.slice(1).map((post) => (
            <PostCard
              key={post.slug}
              slug={post.slug}
              title={post.title}
              excerpt={post.excerpt}
              category={post.category}
              date={post.date}
              readTime={post.readTime}
              imageUrl={post.image}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
