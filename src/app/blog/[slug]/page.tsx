import React from "react";
import BgGlassmorphism from "@/components/BgGlassmorphism";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

interface BlogPost {
  slug: string;
  title: string;
  category: string;
  date: string;
  readTime: string;
  image: string;
  content: string;
}

const posts: Record<string, BlogPost> = {
  "top-10-tips-for-first-time-hosts": {
    slug: "top-10-tips-for-first-time-hosts",
    title: "Top 10 Tips for First-Time Hosts",
    category: "Hosting",
    date: "July 12, 2026",
    readTime: "6 min read",
    image: "https://images.pexels.com/photos/1643383/pexels-photo-1643383.jpeg?auto=compress&cs=tinysrgb&w=1260",
    content: `Starting as a host can feel overwhelming, but these ten tips will set you up for success from your very first guest.

**1. Invest in Great Photos**
Your listing photos are the first thing potential guests see. Use natural light, declutter every room, and shoot from corner angles to make spaces look larger. Even a smartphone can produce stunning results with the right technique.

**2. Write an Honest, Detailed Description**
Don't oversell — set accurate expectations. Mention both the highlights (rooftop terrace, walking distance to the beach) and any limitations (stairs to the third floor, street noise). Guests appreciate honesty and reward it with better reviews.

**3. Price Competitively at First**
Start slightly below similar listings in your area to attract your first bookings and reviews. Once you have a track record of 5-star stays, you can gradually increase your rates.

**4. Create a House Manual**
A comprehensive guide covering Wi-Fi passwords, appliance instructions, local restaurant recommendations, and emergency contacts saves you from answering the same questions repeatedly and makes guests feel at home.

**5. Stock the Essentials**
Fresh towels, quality bed linens, toiletries, coffee, and a few basic pantry items go a long way. Think about what you'd want to find when arriving at a new place after a long journey.

**6. Communicate Proactively**
Send a welcome message before check-in with directions and any last-minute details. Check in (briefly) on the first evening. A quick "hope you're settling in well" message shows you care without being intrusive.

**7. Set Clear House Rules**
Be upfront about noise policies, smoking, pets, and maximum occupancy. Clear rules prevent misunderstandings and protect your property.

**8. Automate Where Possible**
Smart locks eliminate key handoff headaches. Automated messaging handles routine communications. Channel managers sync availability across platforms. The less manual work, the more scalable your hosting becomes.

**9. Respond Quickly**
Fast response times directly impact your search ranking on most platforms. Aim to reply within an hour during waking hours. Enable notifications on your phone so you never miss a booking request.

**10. Ask for Reviews**
After checkout, send a thank-you message and gently remind guests to leave a review. Most happy guests simply forget — a polite nudge makes all the difference for your listing's visibility.`,
  },
  "best-neighborhoods-for-long-term-rentals": {
    slug: "best-neighborhoods-for-long-term-rentals",
    title: "Best Neighborhoods for Long-Term Rentals in 2026",
    category: "Guides",
    date: "July 8, 2026",
    readTime: "8 min read",
    image: "https://images.pexels.com/photos/1396122/pexels-photo-1396122.jpeg?auto=compress&cs=tinysrgb&w=1260",
    content: `The way we live and work has fundamentally changed. With remote work now the norm for millions of professionals, the concept of "home" has become wonderfully flexible. Here are the neighborhoods that are attracting the most long-term renters in 2026.

**Austin, TX — East Austin**
Once an industrial corridor, East Austin has transformed into one of America's most vibrant creative neighborhoods. Long-term renters love the walkable food scene, live music venues within cycling distance, and co-working spaces on nearly every block. Average monthly rents for a one-bedroom hover around $1,800.

**Lisbon, Portugal — Alfama**
Europe's open secret is well and truly out. Lisbon's oldest neighborhood offers cobblestone charm, stunning river views, and a cost of living that's still remarkably reasonable by Western European standards. The city's digital nomad visa has made it even more attractive for remote workers.

**Mexico City — Roma Norte**
Tree-lined streets, art deco architecture, and some of the best food in the Western Hemisphere. Roma Norte has become a magnet for remote workers seeking culture, community, and value. A furnished apartment runs $800-1,200/month — a fraction of comparable neighborhoods in US cities.

**Denver, CO — RiNo (River North Art District)**
For those who want city energy with mountain access, RiNo delivers. Converted warehouses house breweries, galleries, and startups. The neighborhood's creative DNA attracts a diverse community of renters who value both work and play.

**Medellín, Colombia — El Poblado**
Year-round spring weather, modern infrastructure, and a thriving expat community have made Medellín a top destination for long-term stays. El Poblado offers upscale amenities, excellent public transit, and furnished apartments starting around $600/month.

**The Common Thread**
What makes these neighborhoods stand out isn't just affordability — it's the combination of reliable internet, walkability, community spaces, and that intangible quality that makes you want to extend your stay by another month. And another. And another.`,
  },
  "how-to-photograph-your-property": {
    slug: "how-to-photograph-your-property",
    title: "How to Photograph Your Property Like a Pro",
    category: "Hosting",
    date: "July 3, 2026",
    readTime: "5 min read",
    image: "https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg?auto=compress&cs=tinysrgb&w=1260",
    content: `Your listing photos are arguably the single most important factor in whether a guest clicks "Book" or keeps scrolling. The good news? You don't need a professional camera or expensive equipment. Here's how to capture stunning property photos with just your smartphone.

**Timing Is Everything**
Shoot during the "golden hours" — the first hour after sunrise or the last hour before sunset. The warm, soft light eliminates harsh shadows and makes every room look inviting. For interior shots, midday works well when natural light floods through windows.

**Declutter Ruthlessly**
Remove personal items, excess furniture, and anything that makes the space feel smaller. Clear kitchen counters, make beds with crisp linens, and ensure bathrooms are spotless. Less is genuinely more in property photography.

**Use the Rule of Thirds**
Enable the grid overlay on your phone camera. Place key elements along the grid lines or at their intersections. This creates more dynamic, professional-looking compositions than centering everything.

**Shoot From Corners**
Position yourself in the corner of each room and shoot diagonally across the space. This captures the maximum amount of the room in a single frame and makes spaces appear larger and more open.

**Stage Each Room**
A few thoughtful touches transform a room from "vacant" to "inviting": fresh flowers on the dining table, an open book on the nightstand, folded towels on the bed, a coffee cup beside the window. These details help guests imagine themselves in the space.

**Don't Forget the Details**
Capture close-ups of special features: the texture of quality linens, a beautifully set table, architectural details, the view from the balcony. These shots add personality and help your listing stand out from hundreds of similar properties.

**Edit Lightly**
Use your phone's built-in editor to slightly increase brightness and straighten any tilted horizons. Resist the urge to over-filter — guests expect the property to look like the photos, and disappointment on arrival leads to poor reviews.`,
  },
  "summer-travel-trends": {
    slug: "summer-travel-trends",
    title: "Summer 2026 Travel Trends: Where Everyone Is Going",
    category: "Travel",
    date: "June 28, 2026",
    readTime: "7 min read",
    image: "https://images.pexels.com/photos/1450363/pexels-photo-1450363.jpeg?auto=compress&cs=tinysrgb&w=1260",
    content: `Every summer has its destinations — the places that capture the collective imagination and fill up months in advance. Here's where travelers are heading this summer, and what's driving their choices.

**Coastal Croatia**
Beyond Dubrovnik's famous walls, travelers are discovering the quieter Dalmatian islands. Vis, Hvar, and Korčula offer crystal-clear waters, medieval towns, and a pace of life that feels decades removed from the mainland. Demand for beachfront villas here has surged 40% year over year.

**Japanese Countryside**
With Japan's tourism infrastructure now fully reopened, savvy travelers are skipping Tokyo's crowds for the rural countryside. Traditional ryokans in regions like Takayama, Kanazawa, and the Iya Valley offer a Japan that most visitors never see — and at a fraction of city hotel prices.

**Portuguese Algarve**
Southern Portugal's dramatic coastline has always been popular with Europeans, but it's now firmly on the American radar. Cave beaches, cliff-top villas, and fresh seafood at impossibly reasonable prices make it this summer's best-value coastal destination.

**Montana & Wyoming**
The American West is having a moment. Cabin rentals near Yellowstone, Glacier, and Grand Teton have seen record demand. Travelers want wide-open spaces, starry skies, and a complete digital detox — and these states deliver all three.

**The Trend Behind the Trends**
Three patterns emerge: travelers want authentic over manicured, rural over urban, and experiences over amenities. The era of the cookie-cutter resort vacation is fading. Today's travelers want to feel like they've discovered something — a hidden beach, a local restaurant, a mountain trail that doesn't appear on any map.

This shift is great news for unique property hosts. The more character your listing has, the more it appeals to 2026's most engaged travelers.`,
  },
  "remote-work-friendly-stays": {
    slug: "remote-work-friendly-stays",
    title: "The Rise of Remote-Work-Friendly Stays",
    category: "Trends",
    date: "June 22, 2026",
    readTime: "6 min read",
    image: "https://images.pexels.com/photos/4050315/pexels-photo-4050315.jpeg?auto=compress&cs=tinysrgb&w=1260",
    content: `The line between "vacation rental" and "temporary office" has blurred permanently. A growing segment of travelers aren't choosing between work and travel — they're doing both. And they're willing to pay a premium for properties that make remote work comfortable.

**What Remote Workers Actually Need**
Forget the stock photo of someone on a laptop at the beach. Real remote workers need reliable high-speed internet (minimum 50 Mbps, ideally 100+), a dedicated workspace with a proper chair and desk, good natural lighting for video calls, and a quiet environment during business hours.

**The Business Case for Hosts**
Properties marketed as "remote-work-friendly" command 15-25% higher nightly rates than comparable listings without these features. Better yet, remote workers tend to book longer stays (averaging 2-4 weeks vs. 3-5 nights for leisure travelers), which means less turnover, fewer cleaning sessions, and more predictable income.

**Essential Upgrades**
If you want to attract this market, invest in these upgrades:
- A quality desk and ergonomic chair in a quiet area
- A second monitor or monitor stand (surprisingly impactful)
- Fast, reliable Wi-Fi with a backup mobile hotspot
- Blackout curtains in the bedroom (different time zones mean different sleep schedules)
- A coffee station that goes beyond instant packets

**Marketing to Remote Workers**
Include your internet speed test results in your listing. Photograph the workspace setup. Mention nearby co-working spaces and cafes with reliable Wi-Fi. These details signal to remote workers that you understand their needs — and that's what drives bookings.

**The Future**
This isn't a pandemic-era trend that's fading. Remote and hybrid work is now structural. Properties that position themselves as work-friendly today are building a competitive advantage that will compound for years to come.`,
  },
  "ultimate-guest-welcome-guide": {
    slug: "ultimate-guest-welcome-guide",
    title: "The Ultimate Guest Welcome Guide",
    category: "Hosting",
    date: "June 15, 2026",
    readTime: "5 min read",
    image: "https://images.pexels.com/photos/3935350/pexels-photo-3935350.jpeg?auto=compress&cs=tinysrgb&w=1260",
    content: `The first five minutes after a guest walks through your door determine the tone of their entire stay. A thoughtful welcome experience transforms a transaction into a memory — and memories become five-star reviews.

**Before They Arrive**
Send check-in instructions 24 hours before arrival with clear directions, parking information, and your phone number for emergencies. If you know their arrival time, adjust the thermostat so the property is comfortable when they walk in.

**The Welcome Basket**
You don't need to spend a fortune. A curated selection of local treats makes a bigger impression than expensive generic items. Think: coffee from a local roaster, a bottle of wine from a nearby vineyard, fresh fruit, and a handwritten welcome note. Total cost: under $30. Impact on reviews: priceless.

**The House Manual**
Create a simple, well-designed guide covering:
- Wi-Fi network and password (on the first page — guests will look for this immediately)
- How to operate the thermostat, TV, washing machine, and any appliances that aren't self-explanatory
- Your top 5 restaurant recommendations within walking distance
- One "hidden gem" activity that most tourists miss
- Emergency contacts and nearest hospital/pharmacy

**Local Recommendations**
Go beyond the obvious tourist attractions. Create a curated list of the places you'd actually take a friend visiting for the first time. Mark them on a simple map. Include the name of the barista who makes the best coffee in the neighborhood. These personal touches are what guests remember and mention in reviews.

**The Follow-Up**
Check in on the first evening with a brief, warm message. Something like: "Hope you're settling in well! Let me know if you need anything at all." Then give them space. The best hosts are attentive but never intrusive.

**Why It Matters**
Guests who feel genuinely welcomed are more forgiving of minor imperfections, more likely to leave glowing reviews, and much more likely to book again. In a market with thousands of options, hospitality — real, human hospitality — is your strongest competitive advantage.`,
  },
};

export function generateStaticParams() {
  return Object.keys(posts).map((slug) => ({ slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }) {
  const post = posts[params.slug];
  if (!post) return { title: "Post Not Found" };
  return { title: post.title, description: post.content.slice(0, 160) + "..." };
}

const BlogPostPage = ({ params }: { params: { slug: string } }) => {
  const post = posts[params.slug];
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

          <h1 className="text-3xl md:text-4xl font-semibold mt-4">
            {post.title}
          </h1>

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

          <div className="prose prose-neutral dark:prose-invert max-w-none mt-10">
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
              if (paragraph.startsWith("- ")) {
                return (
                  <ul key={i} className="list-disc pl-6 space-y-1 mb-4 text-neutral-600 dark:text-neutral-300">
                    {paragraph.split("\n").map((line, j) => (
                      <li key={j}>{line.replace(/^- /, "")}</li>
                    ))}
                  </ul>
                );
              }
              return (
                <p key={i} className="text-neutral-600 dark:text-neutral-300 leading-relaxed mb-4">
                  {paragraph}
                </p>
              );
            })}
          </div>

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
};

export default BlogPostPage;
