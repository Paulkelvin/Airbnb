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
  "bring-your-kayak-guide-to-the-closest-launches": {
    title: "Bring Your Kayak? Your Guide to the Closest Launches",
    category: "Waterfront", date: "July 23, 2026", readTime: "3 min read",
    image: "/images/local-experiences/great-mills-canoe-and-kayak-launch/kayaker-on-the-river.jpg",
    content: "Potomac Vista Cottage sits back from the water on a quiet street, with no private beach, dock, or pier on site. That does not mean you need to leave your kayak at home. St. Mary's County maintains 15 public landings, and three sit closer to the cottage than the county wharf most guests default to.\n\n**Great Mills Canoe and Kayak Launch**\nOn Route 5, this launch puts you straight onto the St. Mary's River.\n\n**St. Mary's City Waterfront Launch**\nRight by the college, with calm water and easy parking.\n\n**Point Lookout State Park**\nFor a bigger day out, this spot adds a lighthouse, a Civil War museum, and a swimming beach to the trip.\n\n**Left Your Gear at Home?**\nPatuxent Adventure Center rents kayaks and paddleboards right in Leonardtown, at the wharf and at McIntosh Run Park, so getting on the water does not require owning a boat.",
  },
  "no-beach-on-site-where-to-swim-near-leonardtown": {
    title: "No Beach on Site? Here's Where Our Guests Go for Sand and Sun",
    category: "Waterfront", date: "July 20, 2026", readTime: "3 min read",
    image: "/images/local-experiences/point-lookout-state-park/swimming-beach.jpg",
    content: "Guests ask us often whether the cottage has its own beach. It does not, but St. Mary's County has real sand and real water close by, and we would rather point you to the right one than let you guess.\n\n**Breton Beach**\nThe closest option, right in Leonardtown — a small stretch of white sand on Breton Bay that is better for sunbathing, picnicking, and fishing than for swimming laps.\n\n**Greenwell State Park**\nFor actual swimming, this spot on the Patuxent River has gentle, family friendly water.\n\n**Point Lookout State Park**\nA designated swimming beach on the Chesapeake Bay, with showers and restrooms.\n\n**Plan the Trip**\nPack a cooler, bring the kids or the dog, and treat it as a day trip rather than a walk out your back door.",
  },
  "eating-and-drinking-guide-to-leonardtown": {
    title: "A Local's Guide to Eating and Drinking in Leonardtown",
    category: "Dining", date: "July 16, 2026", readTime: "4 min read",
    image: "/images/local-experiences/leonardtown-wharf-park/pier-at-sunset.jpg",
    content: "Leonardtown punches above its weight for a small town. Here is where we send our guests.\n\n**Seafood on the Water**\nRuddy Duck Seafood and Alehouse sits right on the water and is the closest full dinner option.\n\n**Casual Seafood**\nSweetbay Restaurant and Bar and Crab Knockers Seafood cover casual seafood done well.\n\n**Italian**\nIl Piccolo Morso is the pick when you want something other than seafood.\n\n**Wine and Beer**\nPort of Leonardtown Winery pairs a tasting room with live music in a park setting, and Brudergarten Beer Garden does the same with beer.\n\n**Something Sweet**\nSave room for Heritage Chocolates on the way home.",
  },
  "piney-point-lighthouse-hidden-gem": {
    title: "Piney Point Lighthouse: Our Closest Hidden Gem",
    category: "History", date: "July 12, 2026", readTime: "3 min read",
    image: "/images/local-experiences/piney-point-lighthouse-museum-and-historic-park/lighthouse-and-historic-boat.jpg",
    content: "It is easy to miss and it should not be. Piney Point Lighthouse is the single closest attraction to Potomac Vista Cottage, and it comes with a small sandy beach and a boardwalk along the Potomac.\n\n**A Museum, a Walk, a View**\nIt is a museum, a walk, and a place to watch the river, all in one stop.\n\n**Pair It With Lunch**\nStop at Ruddy Duck on the way back for a half day trip that does not require a full tank of gas.",
  },
  "rent-a-kayak-near-the-wharf": {
    title: "Don't Own a Kayak? Rent One Near the Wharf",
    category: "Waterfront", date: "July 9, 2026", readTime: "2 min read",
    image: "/images/local-experiences/leonardtown-wharf-park/pier-over-the-water.jpg",
    content: "Not every guest travels with their own boat, and that is fine.\n\n**Two Locations**\nPatuxent Adventure Center, based in Leonardtown, rents kayaks and paddleboards at both the town wharf and McIntosh Run Park.\n\n**New to Paddling?**\nThey also run SUP classes for anyone who has never paddled before.\n\n**The Bottom Line**\nIt turns a day on the water from a logistics problem into a phone call.",
  },
  "planning-your-stay-potomac-vista-cottage": {
    title: "Planning Your Stay: What to Know Before You Arrive",
    category: "Guides", date: "July 5, 2026", readTime: "3 min read",
    image: "/images/local-experiences/leonardtown-wharf-park/compass-plaza-benches.jpg",
    content: "A few things worth knowing before you get here.\n\n**Check In**\nSelf service with keyless entry, available from 4 PM to 11 PM.\n\n**Water Access**\nThe cottage does not have a private beach, dock, or pier, so if getting on the water is part of your trip, see our guides to the nearest launches and beaches.\n\n**Pets**\nWell behaved dogs are welcome, up to two, on a leash, with a pet fee.\n\n**Parking**\nFits two vehicles in the driveway, with an EV charger on site.\n\n**Around Town**\nOnce you are settled in, Leonardtown's restaurants, wineries, and waterfront are all a short drive away.",
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
              {sanityPost.estimatedReadingTime != null && (
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
