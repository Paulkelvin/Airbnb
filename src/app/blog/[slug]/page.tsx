import React from "react";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import BgGlassmorphism from "@/components/BgGlassmorphism";
import Image from "next/image";
import Link from "next/link";
import { sanityClient, urlFor } from "@/lib/sanity/client";
import { postBySlugQuery, postSlugsQuery } from "@/lib/sanity/queries";
import PortableTextBody from "@/components/sanity/PortableTextBody";
import { getSiteUrl } from "@/lib/site-url";

export const revalidate = 3600;

interface SanityPost {
  _id: string;
  title: string;
  slug: { current: string };
  excerpt?: string;
  publishedAt: string;
  mainImage?: any;
  body?: any;
  seo?: {
    metaTitle?: string;
    metaDescription?: string;
    ogImage?: any;
  };
  categories?: { title: string; slug: { current: string } }[];
  author?: { name: string; slug: { current: string }; image?: any; bio?: string };
  estimatedReadingTime?: number;
}

// --- Hardcoded fallback posts (until Sanity is connected) ---
const fallbackPosts: Record<string, { title: string; category: string; date: string; readTime: string; image: string; content: string }> = {
  "top-10-tips-for-first-time-hosts": {
    title: "Top 10 Tips for First-Time Hosts",
    category: "Hosting", date: "July 12, 2026", readTime: "6 min read",
    image: "https://images.pexels.com/photos/1643383/pexels-photo-1643383.jpeg?auto=compress&cs=tinysrgb&w=1260",
    content: "Starting as a host can feel overwhelming, but these ten tips will set you up for success from your very first guest.\n\n**1. Invest in Great Photos**\nYour listing photos are the first thing potential guests see. Use natural light, declutter every room, and shoot from corner angles to make spaces look larger.\n\n**2. Write an Honest Description**\nDon't oversell — set accurate expectations. Guests appreciate honesty and reward it with better reviews.\n\n**3. Price Competitively at First**\nStart slightly below similar listings to attract your first bookings and reviews.\n\n**4. Create a House Manual**\nA comprehensive guide saves you from answering the same questions repeatedly.\n\n**5. Stock the Essentials**\nFresh towels, quality linens, toiletries, and coffee go a long way.\n\n**6. Communicate Proactively**\nSend a welcome message before check-in with directions and details.\n\n**7. Set Clear House Rules**\nBe upfront about policies to prevent misunderstandings.\n\n**8. Automate Where Possible**\nSmart locks and automated messaging reduce manual work.\n\n**9. Respond Quickly**\nFast response times directly impact your search ranking.\n\n**10. Ask for Reviews**\nA polite nudge after checkout makes all the difference.",
  },
  "best-neighborhoods-for-long-term-rentals": {
    title: "Best Neighborhoods for Long-Term Rentals in 2026",
    category: "Guides", date: "July 8, 2026", readTime: "8 min read",
    image: "https://images.pexels.com/photos/1396122/pexels-photo-1396122.jpeg?auto=compress&cs=tinysrgb&w=1260",
    content: "With remote work now the norm, the concept of 'home' has become wonderfully flexible. Here are the neighborhoods attracting the most long-term renters in 2026.\n\n**Austin, TX — East Austin**\nVibrant creative neighborhood with walkable food scene and co-working spaces. Average one-bedroom: ~$1,800/month.\n\n**Denver, CO — RiNo**\nCity energy with mountain access. Converted warehouses house breweries, galleries, and startups.\n\n**Mexico City — Roma Norte**\nTree-lined streets, art deco architecture, and incredible food. Furnished apartments: $800-1,200/month.",
  },
  "how-to-photograph-your-property": {
    title: "How to Photograph Your Property Like a Pro",
    category: "Hosting", date: "July 3, 2026", readTime: "5 min read",
    image: "https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg?auto=compress&cs=tinysrgb&w=1260",
    content: "Your listing photos are the single most important factor in whether a guest clicks 'Book' or keeps scrolling.\n\n**Timing Is Everything**\nShoot during golden hours for warm, soft light.\n\n**Declutter Ruthlessly**\nRemove personal items and excess furniture.\n\n**Shoot From Corners**\nCapture maximum room in a single frame.\n\n**Edit Lightly**\nSlightly increase brightness and straighten horizons. Don't over-filter.",
  },
  "summer-travel-trends": {
    title: "Summer 2026 Travel Trends: Where Everyone Is Going",
    category: "Travel", date: "June 28, 2026", readTime: "7 min read",
    image: "https://images.pexels.com/photos/1450363/pexels-photo-1450363.jpeg?auto=compress&cs=tinysrgb&w=1260",
    content: "Every summer has its destinations. Here's where travelers are heading this summer.\n\n**Coastal Croatia**\nBeyond Dubrovnik, travelers are discovering the quieter Dalmatian islands.\n\n**Japanese Countryside**\nTraditional ryokans in rural regions offer a Japan most visitors never see.\n\n**Montana & Wyoming**\nCabin rentals near Yellowstone and Glacier see record demand.",
  },
  "remote-work-friendly-stays": {
    title: "The Rise of Remote-Work-Friendly Stays",
    category: "Trends", date: "June 22, 2026", readTime: "6 min read",
    image: "https://images.pexels.com/photos/4050315/pexels-photo-4050315.jpeg?auto=compress&cs=tinysrgb&w=1260",
    content: "A growing segment of travelers aren't choosing between work and travel — they're doing both.\n\n**What Remote Workers Need**\nReliable internet (50+ Mbps), dedicated workspace, good lighting for calls, and quiet during business hours.\n\n**The Business Case**\nRemote-work-friendly properties command 15-25% higher rates with longer average stays.",
  },
  "ultimate-guest-welcome-guide": {
    title: "The Ultimate Guest Welcome Guide",
    category: "Hosting", date: "June 15, 2026", readTime: "5 min read",
    image: "https://images.pexels.com/photos/3935350/pexels-photo-3935350.jpeg?auto=compress&cs=tinysrgb&w=1260",
    content: "The first five minutes after a guest walks through your door determine the tone of their entire stay.\n\n**The Welcome Basket**\nLocal treats, wine from a nearby vineyard, fresh fruit, and a handwritten note. Cost: under $30. Impact: priceless.\n\n**The House Manual**\nWi-Fi password on page one. Appliance instructions. Your top 5 restaurant picks.",
  },
};

async function getPost(slug: string): Promise<SanityPost | null> {
  if (!process.env.NEXT_PUBLIC_SANITY_PROJECT_ID) return null;
  try {
    return await sanityClient.fetch<SanityPost | null>(postBySlugQuery, { slug });
  } catch {
    return null;
  }
}

export async function generateStaticParams() {
  if (!process.env.NEXT_PUBLIC_SANITY_PROJECT_ID) {
    return Object.keys(fallbackPosts).map((slug) => ({ slug }));
  }
  try {
    const slugs = await sanityClient.fetch<{ slug: string }[]>(postSlugsQuery);
    return slugs.map((s) => ({ slug: s.slug }));
  } catch {
    return Object.keys(fallbackPosts).map((slug) => ({ slug }));
  }
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const sanityPost = await getPost(params.slug);
  const siteUrl = getSiteUrl();
  const canonical = `${siteUrl}/blog/${params.slug}`;

  if (sanityPost) {
    const title = sanityPost.seo?.metaTitle || sanityPost.title;
    const description =
      sanityPost.seo?.metaDescription || sanityPost.excerpt || "";
    const ogImageSource = sanityPost.seo?.ogImage || sanityPost.mainImage;
    const ogImageUrl = ogImageSource
      ? urlFor(ogImageSource).width(1200).height(630).quality(80).url()
      : undefined;

    return {
      title,
      description,
      alternates: { canonical },
      openGraph: {
        title,
        description,
        url: canonical,
        type: "article",
        publishedTime: sanityPost.publishedAt,
        authors: sanityPost.author?.name ? [sanityPost.author.name] : undefined,
        images: ogImageUrl ? [{ url: ogImageUrl, width: 1200, height: 630 }] : undefined,
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: ogImageUrl ? [ogImageUrl] : undefined,
      },
    };
  }

  const fallback = fallbackPosts[params.slug];
  if (!fallback) return { title: "Post Not Found" };
  return {
    title: fallback.title,
    description: fallback.content.slice(0, 160) + "...",
    alternates: { canonical },
  };
}

function JsonLd({ post, slug }: { post: SanityPost; slug: string }) {
  const siteUrl = getSiteUrl();
  const imageUrl = post.mainImage
    ? urlFor(post.mainImage).width(1200).height(630).url()
    : undefined;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt || "",
    url: `${siteUrl}/blog/${slug}`,
    datePublished: post.publishedAt,
    image: imageUrl,
    author: post.author
      ? { "@type": "Person", name: post.author.name }
      : { "@type": "Organization", name: "Potomac" },
    publisher: {
      "@type": "Organization",
      name: "Potomac",
      url: siteUrl,
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${siteUrl}/blog/${slug}`,
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

export default async function BlogPostPage({
  params,
}: {
  params: { slug: string };
}) {
  const sanityPost = await getPost(params.slug);

  if (sanityPost) {
    const heroImage = sanityPost.mainImage
      ? urlFor(sanityPost.mainImage).width(1400).quality(85).url()
      : null;

    return (
      <div className="nc-BlogPostPage overflow-hidden relative">
        <JsonLd post={sanityPost} slug={params.slug} />
        <BgGlassmorphism />
        <div className="container relative py-16 lg:py-28">
          <article className="max-w-3xl mx-auto">
            <div className="flex items-center gap-3 text-sm text-neutral-500 dark:text-neutral-400 flex-wrap">
              {sanityPost.categories?.map((cat) => (
                <span
                  key={cat.slug.current}
                  className="px-3 py-1 bg-neutral-100 dark:bg-neutral-800 rounded-full text-xs font-medium"
                >
                  {cat.title}
                </span>
              ))}
              <span>
                {new Date(sanityPost.publishedAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
              {sanityPost.estimatedReadingTime && (
                <>
                  <span>&middot;</span>
                  <span>{sanityPost.estimatedReadingTime} min read</span>
                </>
              )}
            </div>

            <h1 className="text-3xl md:text-4xl font-semibold mt-4">
              {sanityPost.title}
            </h1>

            {sanityPost.author && (
              <div className="flex items-center gap-3 mt-6">
                {sanityPost.author.image && (
                  <Image
                    src={urlFor(sanityPost.author.image).width(80).height(80).url()}
                    alt={sanityPost.author.name}
                    width={40}
                    height={40}
                    className="rounded-full object-cover"
                  />
                )}
                <div>
                  <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                    {sanityPost.author.name}
                  </p>
                  {sanityPost.author.bio && (
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-1">
                      {sanityPost.author.bio}
                    </p>
                  )}
                </div>
              </div>
            )}

            {heroImage && (
              <div className="relative aspect-[16/9] rounded-2xl overflow-hidden mt-8">
                <Image
                  src={heroImage}
                  fill
                  alt={sanityPost.mainImage?.alt || sanityPost.title}
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 768px"
                  priority
                />
              </div>
            )}

            {sanityPost.body && (
              <div className="mt-10">
                <PortableTextBody value={sanityPost.body} />
              </div>
            )}

            <div className="border-t border-neutral-200 dark:border-neutral-700 mt-12 pt-8">
              <Link
                href="/blog"
                className="text-primary-600 font-medium hover:underline"
              >
                &larr; Back to all posts
              </Link>
            </div>
          </article>
        </div>
      </div>
    );
  }

  // Fallback to hardcoded posts
  const post = fallbackPosts[params.slug];
  if (!post) notFound();

  return (
    <div className="nc-BlogPostPage overflow-hidden relative">
      <BgGlassmorphism />
      <div className="container relative py-16 lg:py-28">
        <article className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 text-sm text-neutral-500 dark:text-neutral-400">
            <span className="px-3 py-1 bg-neutral-100 dark:bg-neutral-800 rounded-full text-xs font-medium">
              {post.category}
            </span>
            <span>{post.date}</span>
            <span>&middot;</span>
            <span>{post.readTime}</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-semibold mt-4">{post.title}</h1>
          <div className="relative aspect-[16/9] rounded-2xl overflow-hidden mt-8">
            <Image
              src={post.image}
              fill
              alt={post.title}
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 768px"
              priority
            />
          </div>
          <div className="mt-10">
            {post.content.split("\n\n").map((paragraph, i) => {
              if (paragraph.startsWith("**") && paragraph.endsWith("**")) {
                return (
                  <h3 key={i} className="text-xl font-semibold mt-8 mb-3">
                    {paragraph.replace(/\*\*/g, "")}
                  </h3>
                );
              }
              if (paragraph.startsWith("**")) {
                const match = paragraph.match(/^\*\*(.+?)\*\*\n?([\s\S]*)/);
                if (match) {
                  return (
                    <div key={i}>
                      <h3 className="text-xl font-semibold mt-8 mb-3">{match[1]}</h3>
                      {match[2] && (
                        <p className="text-neutral-600 dark:text-neutral-300 leading-relaxed mb-4">
                          {match[2]}
                        </p>
                      )}
                    </div>
                  );
                }
              }
              return (
                <p key={i} className="text-neutral-600 dark:text-neutral-300 leading-relaxed mb-4">
                  {paragraph}
                </p>
              );
            })}
          </div>
          <div className="border-t border-neutral-200 dark:border-neutral-700 mt-12 pt-8">
            <Link href="/blog" className="text-primary-600 font-medium hover:underline">
              &larr; Back to all posts
            </Link>
          </div>
        </article>
      </div>
    </div>
  );
}
