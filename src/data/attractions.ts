export const ATTRACTION_CATEGORIES = [
  "Restaurant",
  "Park",
  "Waterfront",
  "Activity",
  "Historic Site",
  "Shopping",
] as const;

export type AttractionCategory = (typeof ATTRACTION_CATEGORIES)[number];

export interface Attraction {
  id: string;
  title: string;
  category: string;
  description: string;
  imageUrl: string;
  distanceLabel: string;
  externalUrl?: string;
  featured: boolean;
}

// Fallback content shown if Sanity isn't configured, matching the pattern
// used by src/data/faqs.ts — the site should never show an empty "Explore
// the Area" section.
export const attractions: Attraction[] = [
  {
    id: "1",
    title: "Riverbend Park",
    category: "Waterfront",
    description:
      "A quiet stretch of public Potomac riverfront with walking trails, kayak launch, and some of the best sunset views in the area.",
    imageUrl:
      "https://images.pexels.com/photos/158063/bellingrath-gardens-alabama-landscape-scenic-158063.jpeg?auto=compress&cs=tinysrgb&w=800",
    distanceLabel: "10 min drive",
    featured: true,
  },
  {
    id: "2",
    title: "Great Falls Park",
    category: "Park",
    description:
      "Dramatic waterfalls and river gorge views along the Potomac, with miles of hiking trails for every skill level.",
    imageUrl:
      "https://images.pexels.com/photos/572897/pexels-photo-572897.jpeg?auto=compress&cs=tinysrgb&w=800",
    distanceLabel: "15 min drive",
    featured: true,
  },
  {
    id: "3",
    title: "The Blue Heron Grill",
    category: "Restaurant",
    description:
      "Locally loved seafood spot with a riverside patio — the crab cakes are the reason regulars keep coming back.",
    imageUrl:
      "https://images.pexels.com/photos/262978/pexels-photo-262978.jpeg?auto=compress&cs=tinysrgb&w=800",
    distanceLabel: "5 min drive",
    featured: true,
  },
  {
    id: "4",
    title: "Old Town Waterfront",
    category: "Waterfront",
    description:
      "Cobblestone streets, boutique shops, and a lively public marina right on the river — an easy half-day outing.",
    imageUrl:
      "https://images.pexels.com/photos/208745/pexels-photo-208745.jpeg?auto=compress&cs=tinysrgb&w=800",
    distanceLabel: "20 min drive",
    featured: true,
  },
  {
    id: "5",
    title: "Potomac Heritage Trail",
    category: "Activity",
    description:
      "A scenic trail hugging the river, popular with runners and cyclists, with several access points near the cottage.",
    imageUrl:
      "https://images.pexels.com/photos/1671324/pexels-photo-1671324.jpeg?auto=compress&cs=tinysrgb&w=800",
    distanceLabel: "8 min drive",
    featured: false,
  },
  {
    id: "6",
    title: "Millhouse Antiques & Market",
    category: "Shopping",
    description:
      "A converted 19th-century mill now home to antique dealers, a farmers market on weekends, and a small cafe.",
    imageUrl:
      "https://images.pexels.com/photos/1927259/pexels-photo-1927259.jpeg?auto=compress&cs=tinysrgb&w=800",
    distanceLabel: "12 min drive",
    featured: false,
  },
  {
    id: "7",
    title: "Fort Hunt Historic Site",
    category: "Historic Site",
    description:
      "Civil War-era fortifications turned peaceful riverside park, with interpretive trails and picnic areas.",
    imageUrl:
      "https://images.pexels.com/photos/1310788/pexels-photo-1310788.jpeg?auto=compress&cs=tinysrgb&w=800",
    distanceLabel: "18 min drive",
    featured: false,
  },
  {
    id: "8",
    title: "Riverside Kayak & Paddleboard Rentals",
    category: "Activity",
    description:
      "Rent a kayak or paddleboard right on the water — no waterfront access needed at the cottage when this is minutes away.",
    imageUrl:
      "https://images.pexels.com/photos/1497582/pexels-photo-1497582.jpeg?auto=compress&cs=tinysrgb&w=800",
    distanceLabel: "10 min drive",
    featured: false,
  },
];
