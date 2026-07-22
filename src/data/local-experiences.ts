/**
 * "Local Experience" rather than "Attraction" — deliberately broader so the
 * content model stretches to festivals, wineries, kayaking outfitters,
 * seasonal events, farmers markets, museums, and scenic drives later, not
 * just a fixed list of tourist attractions.
 */
export const EXPERIENCE_CATEGORIES = [
  "Waterfront",
  "Coffee",
  "Dining",
  "Family",
  "History",
  "Nature",
  "Nightlife",
] as const;

export type ExperienceCategory = (typeof EXPERIENCE_CATEGORIES)[number];

/** Sorts categories into the canonical display order above (Waterfront
 * first, per the source brief) rather than whatever order they happened to
 * come back from the data layer in. Anything not in the canonical list
 * (shouldn't happen, but data is data) sorts after the known ones. */
export function sortCategories(categories: string[]): string[] {
  return [...categories].sort((a, b) => {
    const ai = EXPERIENCE_CATEGORIES.indexOf(a as ExperienceCategory);
    const bi = EXPERIENCE_CATEGORIES.indexOf(b as ExperienceCategory);
    return (ai === -1 ? EXPERIENCE_CATEGORIES.length : ai) - (bi === -1 ? EXPERIENCE_CATEGORIES.length : bi);
  });
}

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
// the Area" section. Real Leonardtown, MD-area waterfront spots near the
// actual cottage address (18981 Little Pond Lane), with real photos, sourced
// from a call with Margo — replaces the previous DC-area demo placeholders,
// which were the wrong part of the state entirely. The cottage itself has no
// private water access, so Waterfront is deliberately the lead category.
//
// Piney Point Lighthouse's coordinates (previously unresolved — the address
// given during the original call was identical to Leonardtown Wharf Park's,
// a copy/paste error rather than a real second address) are now pinned from
// the lighthouse's actual OSM location, independent of that bad source data.
//
// Leonardtown Wharf Park and Piney Point's distances combine a confirmed
// drive time with a separately-computed real routing distance (via OSM/OSRM,
// not guessed) — matching the live CMS content.
//
// Two of a later batch of source coordinates (for Great Mills and Point
// Lookout) were dropped rather than applied: each contradicted the street
// address given for the same place in the same message (reverse-geocoding
// put them miles away, in the wrong town/zip). The coordinates already here
// were kept since they independently match Point Lookout's real address.
//
// All five locations' full photo sets (5 images each) were pulled in from
// the source Drive folders — previously only 3 of 5 per location had made it
// into the site.
export const localExperiences: LocalExperience[] = [
  {
    id: "1",
    slug: "great-mills-canoe-and-kayak-launch",
    title: "Great Mills Canoe and Kayak Launch",
    category: "Waterfront",
    tagline: "A public launch on Route 5 with direct access to the St. Mary's River.",
    description:
      "The closest public kayak and canoe launch to the cottage, right on the St. Mary's River off Route 5. There's no launch on the property itself, so this is where guests go to get out on the water — bring your own kayak, paddleboard, or gear.",
    imageUrl: "/images/local-experiences/great-mills-canoe-and-kayak-launch/canoeing-under-canopy.jpg",
    galleryImageUrls: [
      "/images/local-experiences/great-mills-canoe-and-kayak-launch/kayaker-on-the-river.jpg",
      "/images/local-experiences/great-mills-canoe-and-kayak-launch/canoes-at-the-launch.jpg",
      "/images/local-experiences/great-mills-canoe-and-kayak-launch/wooden-launch-dock.jpg",
      "/images/local-experiences/great-mills-canoe-and-kayak-launch/shallow-river-bend.jpg",
    ],
    distanceLabel: "14 min drive",
    latitude: 38.2374737,
    longitude: -76.4990958,
    openingHours: null,
    websiteUrl: null,
    featured: true,
  },
  {
    id: "2",
    slug: "st-marys-river-state-park",
    title: "St. Mary's River State Park",
    category: "Waterfront",
    tagline: "A quiet state park with river access, trails, and picnic spots.",
    description:
      "A Maryland state park along the St. Mary's River with a launch, hiking trails, and picnic areas — a short drive from the cottage and an easy way to spend an afternoon on the water.",
    imageUrl: "/images/local-experiences/st-marys-river-state-park/launch-dock-view.jpg",
    galleryImageUrls: [
      "/images/local-experiences/st-marys-river-state-park/wooden-footbridge.jpg",
      "/images/local-experiences/st-marys-river-state-park/wildflower-meadow-shoreline.jpg",
      "/images/local-experiences/st-marys-river-state-park/forest-boardwalk-trail.jpg",
      "/images/local-experiences/st-marys-river-state-park/kayaking-the-still-water.jpg",
    ],
    distanceLabel: "12 min drive",
    latitude: 38.2197948,
    longitude: -76.5740822,
    openingHours: null,
    websiteUrl: null,
    featured: true,
  },
  {
    id: "3",
    slug: "point-lookout-state-park",
    title: "Point Lookout State Park",
    category: "Waterfront",
    tagline: "A scenic day trip where the Potomac meets the Chesapeake Bay.",
    description:
      "At the southern tip of the county, where the Potomac River meets the Chesapeake Bay. Swimming beach, fishing pier, camping, and Civil War history — worth the drive for a full day out.",
    imageUrl: "/images/local-experiences/point-lookout-state-park/sunset-over-civil-war-camp.jpg",
    galleryImageUrls: [
      "/images/local-experiences/point-lookout-state-park/aerial-view-of-the-point.jpg",
      "/images/local-experiences/point-lookout-state-park/swimming-beach.jpg",
      "/images/local-experiences/point-lookout-state-park/rocky-jetty-shoreline.jpg",
      "/images/local-experiences/point-lookout-state-park/fishing-pier.jpg",
    ],
    distanceLabel: "34 min drive",
    latitude: 38.0643089,
    longitude: -76.3360016,
    openingHours: null,
    websiteUrl: null,
    featured: true,
  },
  {
    id: "4",
    slug: "leonardtown-wharf-park",
    title: "Leonardtown Wharf Park",
    category: "Waterfront",
    tagline: "Kayak launch, fishing pier, and some of the best sunset views in town.",
    description:
      "Leonardtown's own waterfront park, with a kayak launch, pier, and open lawn that's popular for sunset views. The cottage itself has no water access, so this is one of the closest ways to get on the water without your own boat.",
    imageUrl: "/images/local-experiences/leonardtown-wharf-park/entrance-sign-and-gazebo.jpg",
    galleryImageUrls: [
      "/images/local-experiences/leonardtown-wharf-park/compass-plaza-benches.jpg",
      "/images/local-experiences/leonardtown-wharf-park/flagpole-promenade.jpg",
      "/images/local-experiences/leonardtown-wharf-park/pier-over-the-water.jpg",
      "/images/local-experiences/leonardtown-wharf-park/pier-at-sunset.jpg",
    ],
    distanceLabel: "~19 min / ~13 mi",
    latitude: 38.2433866,
    longitude: -76.6556717,
    openingHours: null,
    websiteUrl: null,
    featured: true,
  },
  {
    id: "5",
    slug: "piney-point-lighthouse-museum-and-historic-park",
    title: "Piney Point Lighthouse Museum & Historic Park",
    category: "Waterfront",
    tagline: "A historic lighthouse and museum on the water, with a small beach.",
    description:
      "One of the oldest lighthouses on the Potomac, now a museum and historic park with a small beach and picnic area. A nice half-day trip if you want history along with the water.",
    imageUrl: "/images/local-experiences/piney-point-lighthouse-museum-and-historic-park/sandy-shoreline.jpg",
    galleryImageUrls: [
      "/images/local-experiences/piney-point-lighthouse-museum-and-historic-park/boardwalk-to-the-pier.jpg",
      "/images/local-experiences/piney-point-lighthouse-museum-and-historic-park/dock-pilings-view.jpg",
      "/images/local-experiences/piney-point-lighthouse-museum-and-historic-park/lighthouse-and-historic-boat.jpg",
      "/images/local-experiences/piney-point-lighthouse-museum-and-historic-park/view-from-the-tower.jpg",
    ],
    distanceLabel: "~19 min / ~8.1 mi",
    latitude: 38.1353379,
    longitude: -76.5297116,
    openingHours: null,
    websiteUrl: null,
    featured: true,
  },
];
