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
    slug: "top-10-tips-for-first-time-hosts",
    title: "Top 10 Tips for First-Time Hosts",
    excerpt: "Starting your hosting journey? These practical tips will help you create memorable guest experiences, earn great reviews, and maximize your rental income from day one.",
    category: "Hosting",
    date: "July 12, 2026",
    readTime: "6 min read",
    image: "https://res.cloudinary.com/lbwzvp5s/image/upload/v1784633867/blog/top-10-tips-for-first-time-hosts.jpg",
  },
  {
    slug: "best-neighborhoods-for-long-term-rentals",
    title: "Best Neighborhoods for Long-Term Rentals in 2026",
    excerpt: "Whether you're relocating for work or embracing the digital nomad lifestyle, these neighborhoods offer the perfect blend of affordability, convenience, and character.",
    category: "Guides",
    date: "July 8, 2026",
    readTime: "8 min read",
    image: "https://res.cloudinary.com/lbwzvp5s/image/upload/v1784633898/blog/best-neighborhoods-for-long-term-rentals.jpg",
  },
  {
    slug: "how-to-photograph-your-property",
    title: "How to Photograph Your Property Like a Pro",
    excerpt: "Great photos can double your booking rate. Learn the lighting, staging, and composition techniques that professional property photographers use — with just your phone.",
    category: "Hosting",
    date: "July 3, 2026",
    readTime: "5 min read",
    image: "https://res.cloudinary.com/lbwzvp5s/image/upload/v1784633898/blog/how-to-photograph-your-property.jpg",
  },
  {
    slug: "summer-travel-trends",
    title: "Summer 2026 Travel Trends: Where Everyone Is Going",
    excerpt: "From coastal retreats to mountain escapes, discover the destinations trending this summer and why travelers are choosing unique stays over traditional hotels.",
    category: "Travel",
    date: "June 28, 2026",
    readTime: "7 min read",
    image: "https://res.cloudinary.com/lbwzvp5s/image/upload/v1784633899/blog/summer-travel-trends.jpg",
  },
  {
    slug: "remote-work-friendly-stays",
    title: "The Rise of Remote-Work-Friendly Stays",
    excerpt: "More travelers than ever are combining work and travel. Here's what makes a property truly remote-work-friendly, and how hosts can tap into this growing market.",
    category: "Trends",
    date: "June 22, 2026",
    readTime: "6 min read",
    image: "https://res.cloudinary.com/lbwzvp5s/image/upload/v1784633871/blog/remote-work-friendly-stays.jpg",
  },
  {
    slug: "ultimate-guest-welcome-guide",
    title: "The Ultimate Guest Welcome Guide",
    excerpt: "First impressions matter. From welcome baskets to house manuals, learn how top-rated hosts create arrival experiences that earn five-star reviews every time.",
    category: "Hosting",
    date: "June 15, 2026",
    readTime: "5 min read",
    image: "https://res.cloudinary.com/lbwzvp5s/image/upload/v1784633872/blog/ultimate-guest-welcome-guide.jpg",
  },
];
