export interface BlogPostSummary {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  date: string;
  readTime: string;
  image: string;
}

export const blogPosts: BlogPostSummary[] = [
  {
    slug: "bring-your-kayak-guide-to-the-closest-launches",
    title: "Bring Your Kayak? Your Guide to the Closest Launches",
    excerpt: "We do not have a private dock, but these three public launches get you on the water in minutes.",
    category: "Waterfront",
    date: "July 23, 2026",
    readTime: "3 min read",
    image: "/images/local-experiences/great-mills-canoe-and-kayak-launch/kayaker-on-the-river.jpg",
  },
  {
    slug: "no-beach-on-site-where-to-swim-near-leonardtown",
    title: "No Beach on Site? Here's Where Our Guests Go for Sand and Sun",
    excerpt: "Three real swimming spots within a short drive, no private beach required.",
    category: "Waterfront",
    date: "July 20, 2026",
    readTime: "3 min read",
    image: "/images/local-experiences/point-lookout-state-park/swimming-beach.jpg",
  },
  {
    slug: "eating-and-drinking-guide-to-leonardtown",
    title: "A Local's Guide to Eating and Drinking in Leonardtown",
    excerpt: "From seafood on the water to wine with a view, here is where our guests eat during their stay.",
    category: "Dining",
    date: "July 16, 2026",
    readTime: "4 min read",
    image: "/images/local-experiences/leonardtown-wharf-park/pier-at-sunset.jpg",
  },
  {
    slug: "piney-point-lighthouse-hidden-gem",
    title: "Piney Point Lighthouse: Our Closest Hidden Gem",
    excerpt: "Fourteen minutes away, a historic lighthouse with its own sandy beach and boardwalk.",
    category: "History",
    date: "July 12, 2026",
    readTime: "3 min read",
    image: "/images/local-experiences/piney-point-lighthouse-museum-and-historic-park/lighthouse-and-historic-boat.jpg",
  },
  {
    slug: "rent-a-kayak-near-the-wharf",
    title: "Don't Own a Kayak? Rent One Near the Wharf",
    excerpt: "Patuxent Adventure Center rents kayaks and paddleboards right where you need them.",
    category: "Waterfront",
    date: "July 9, 2026",
    readTime: "2 min read",
    image: "/images/local-experiences/leonardtown-wharf-park/pier-over-the-water.jpg",
  },
  {
    slug: "planning-your-stay-potomac-vista-cottage",
    title: "Planning Your Stay: What to Know Before You Arrive",
    excerpt: "Check in, water access, pets, and everything else to expect at Potomac Vista Cottage.",
    category: "Guides",
    date: "July 5, 2026",
    readTime: "3 min read",
    image: "/images/local-experiences/leonardtown-wharf-park/compass-plaza-benches.jpg",
  },
];
