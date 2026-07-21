/**
 * "Local Experience" rather than "Attraction" — deliberately broader so the
 * content model stretches to festivals, wineries, kayaking outfitters,
 * seasonal events, farmers markets, museums, and scenic drives later, not
 * just a fixed list of tourist attractions.
 */
export const EXPERIENCE_CATEGORIES = [
  "Dining",
  "Waterfront",
  "Family",
  "Nature",
  "Coffee",
  "Nightlife",
  "History",
] as const;

export type ExperienceCategory = (typeof EXPERIENCE_CATEGORIES)[number];

export const CATEGORY_EMOJI: Record<string, string> = {
  Dining: "🍽️",
  Waterfront: "🌊",
  Family: "👨‍👩‍👧‍👦",
  Nature: "🌳",
  Coffee: "☕",
  Nightlife: "🎉",
  History: "🏛️",
};

export interface LocalExperience {
  id: string;
  slug: string;
  title: string;
  category: string;
  tagline: string;
  description: string;
  imageUrl: string;
  galleryImageUrls: string[];
  distanceLabel: string;
  latitude: number | null;
  longitude: number | null;
  openingHours: string | null;
  websiteUrl: string | null;
  featured: boolean;
}

// Fallback content shown if Sanity isn't configured, matching the pattern
// used by src/data/faqs.ts — the site should never show an empty "Explore
// the Area" section. Coordinates are real DC-area landmarks so the map
// renders sensibly; everything else is placeholder until real photos and
// copy are supplied.
export const localExperiences: LocalExperience[] = [
  {
    id: "1",
    slug: "riverbend-park",
    title: "Riverbend Park",
    category: "Waterfront",
    tagline: "Ideal for morning walks and sunset views over the Potomac.",
    description:
      "A quiet stretch of public Potomac riverfront with walking trails, a kayak launch, and some of the best sunset views in the area.",
    imageUrl:
      "https://images.pexels.com/photos/158063/bellingrath-gardens-alabama-landscape-scenic-158063.jpeg?auto=compress&cs=tinysrgb&w=1200",
    galleryImageUrls: [],
    distanceLabel: "10 min drive",
    latitude: 39.0032,
    longitude: -77.2296,
    openingHours: "Daily, dawn to dusk",
    websiteUrl: "https://www.fairfaxcounty.gov/parks/riverbend",
    featured: true,
  },
  {
    id: "2",
    slug: "great-falls-park",
    title: "Great Falls Park",
    category: "Nature",
    tagline: "Dramatic waterfalls and cliffside trails — bring a camera.",
    description:
      "Dramatic waterfalls and river gorge views along the Potomac, with miles of hiking trails for every skill level.",
    imageUrl:
      "https://images.pexels.com/photos/572897/pexels-photo-572897.jpeg?auto=compress&cs=tinysrgb&w=1200",
    galleryImageUrls: [],
    distanceLabel: "15 min drive",
    latitude: 38.9977,
    longitude: -77.2472,
    openingHours: "Daily, 7am to dark",
    websiteUrl: "https://www.nps.gov/grfa",
    featured: true,
  },
  {
    id: "3",
    slug: "the-blue-heron-grill",
    title: "The Blue Heron Grill",
    category: "Dining",
    tagline: "Locals' favorite for crab cakes and a riverside sunset.",
    description:
      "Locally loved seafood spot with a riverside patio — the crab cakes are the reason regulars keep coming back.",
    imageUrl:
      "https://images.pexels.com/photos/262978/pexels-photo-262978.jpeg?auto=compress&cs=tinysrgb&w=1200",
    galleryImageUrls: [],
    distanceLabel: "5 min drive",
    latitude: 38.8055,
    longitude: -77.0405,
    openingHours: "Daily, 11am–10pm",
    websiteUrl: null,
    featured: true,
  },
  {
    id: "4",
    slug: "national-harbor",
    title: "National Harbor",
    category: "Family",
    tagline: "A lively waterfront boardwalk with shops, dining, and the Capital Wheel.",
    description:
      "Cobblestone promenades, boutique shops, and a lively public marina right on the river — an easy half-day outing for the whole family.",
    imageUrl:
      "https://images.pexels.com/photos/208745/pexels-photo-208745.jpeg?auto=compress&cs=tinysrgb&w=1200",
    galleryImageUrls: [],
    distanceLabel: "20 min drive",
    latitude: 38.7804,
    longitude: -77.0159,
    openingHours: "Shops and restaurants vary, generally 10am–9pm",
    websiteUrl: "https://www.nationalharbor.com",
    featured: true,
  },
  {
    id: "5",
    slug: "potomac-heritage-trail",
    title: "Potomac Heritage Trail",
    category: "Nature",
    tagline: "A scenic riverside trail, popular with runners and cyclists.",
    description:
      "A scenic trail hugging the river, popular with runners and cyclists, with several access points near the cottage.",
    imageUrl:
      "https://images.pexels.com/photos/1671324/pexels-photo-1671324.jpeg?auto=compress&cs=tinysrgb&w=1200",
    galleryImageUrls: [],
    distanceLabel: "8 min drive",
    latitude: 38.9515,
    longitude: -77.1467,
    openingHours: "Open year-round",
    websiteUrl: null,
    featured: false,
  },
  {
    id: "6",
    slug: "millhouse-antiques-market",
    title: "Millhouse Antiques & Market",
    category: "Family",
    tagline: "A converted 19th-century mill with a weekend farmers market.",
    description:
      "A converted 19th-century mill now home to antique dealers, a farmers market on weekends, and a small cafe.",
    imageUrl:
      "https://images.pexels.com/photos/1927259/pexels-photo-1927259.jpeg?auto=compress&cs=tinysrgb&w=1200",
    galleryImageUrls: [],
    distanceLabel: "12 min drive",
    latitude: 38.8067,
    longitude: -77.0472,
    openingHours: "Sat–Sun, 8am–2pm (market); shops daily",
    websiteUrl: null,
    featured: false,
  },
  {
    id: "7",
    slug: "fort-hunt-park",
    title: "Fort Hunt Park",
    category: "History",
    tagline: "Civil War-era fortifications turned peaceful riverside picnic grounds.",
    description:
      "Civil War-era fortifications turned peaceful riverside park, with interpretive trails and picnic areas.",
    imageUrl:
      "https://images.pexels.com/photos/1310788/pexels-photo-1310788.jpeg?auto=compress&cs=tinysrgb&w=1200",
    galleryImageUrls: [],
    distanceLabel: "18 min drive",
    latitude: 38.7095,
    longitude: -77.0522,
    openingHours: "Daily, 7am to dark",
    websiteUrl: "https://www.nps.gov/gwmp",
    featured: false,
  },
  {
    id: "8",
    slug: "riverside-kayak-paddleboard-rentals",
    title: "Riverside Kayak & Paddleboard Rentals",
    category: "Waterfront",
    tagline: "No waterfront access needed at the cottage when this is minutes away.",
    description:
      "Rent a kayak or paddleboard right on the water — a short trip from the cottage puts you right on the river.",
    imageUrl:
      "https://images.pexels.com/photos/1497582/pexels-photo-1497582.jpeg?auto=compress&cs=tinysrgb&w=1200",
    galleryImageUrls: [],
    distanceLabel: "10 min drive",
    latitude: 38.7856,
    longitude: -77.0507,
    openingHours: "Daily, 9am–6pm (seasonal)",
    websiteUrl: null,
    featured: false,
  },
];
