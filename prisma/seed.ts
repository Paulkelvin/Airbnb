import { PrismaClient, AmenityCategory } from "@prisma/client";
import bcrypt from "bcryptjs";

/**
 * Reference data (property types, amenities) below is safe to re-run against
 * any environment, including production. The demo admin/host accounts and 15
 * demo listings further down are not: their credentials are hardcoded and
 * committed to source control (see `docs/project-status.md` §10 finding C1).
 * That's a known, intentionally-not-yet-changed tradeoff — the client holds
 * the current login privately and wants this seed script's behavior
 * unchanged for now. Do not print, document, or otherwise re-expose those
 * credentials anywhere outside this file.
 *
 * Recommended long-term fix, for whenever this gets prioritized: read the
 * demo admin/host email+password from environment variables (e.g.
 * `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD`, `SEED_HOST_EMAIL`/
 * `SEED_HOST_PASSWORD`) with no hardcoded fallback in production, and/or gate
 * demo-account/demo-listing creation behind the same
 * non-production+explicit-opt-in guard `prisma/seed-dev-data.ts` already
 * uses, so a script that's safe to run against prod for reference data can't
 * also seed a real, source-controlled admin login into it.
 */
const prisma = new PrismaClient();

const propertyTypes = [
  { name: "Apartment", slug: "apartment", description: "Self-contained unit within a larger building", icon: "apartment" },
  { name: "House", slug: "house", description: "Standalone residential property", icon: "house" },
  { name: "Condo", slug: "condo", description: "Privately owned unit in a condominium complex", icon: "condo" },
  { name: "Townhouse", slug: "townhouse", description: "Multi-floor home sharing walls with adjacent properties", icon: "townhouse" },
  { name: "Villa", slug: "villa", description: "Luxury standalone property, often with grounds", icon: "villa" },
  { name: "Cottage", slug: "cottage", description: "Small, cozy home often in rural settings", icon: "cottage" },
  { name: "Loft", slug: "loft", description: "Open-plan living space, often converted commercial", icon: "loft" },
  { name: "Studio", slug: "studio", description: "Single-room dwelling combining living and sleeping areas", icon: "studio" },
  { name: "Penthouse", slug: "penthouse", description: "Top-floor luxury apartment", icon: "penthouse" },
  { name: "Duplex", slug: "duplex", description: "Two-unit building, each with separate entrance", icon: "duplex" },
  { name: "Cabin", slug: "cabin", description: "Rustic dwelling, typically in natural settings", icon: "cabin" },
  { name: "Bungalow", slug: "bungalow", description: "Single-story home with a veranda", icon: "bungalow" },
  { name: "Guest House", slug: "guest-house", description: "Secondary dwelling on a property", icon: "guest-house" },
  { name: "Farmhouse", slug: "farmhouse", description: "Residential property on agricultural land", icon: "farmhouse" },
  { name: "Commercial Space", slug: "commercial-space", description: "Office or retail property for business use", icon: "commercial" },
];

const amenities: { name: string; slug: string; category: AmenityCategory; icon: string }[] = [
  { name: "Wi-Fi", slug: "wifi", category: "BASIC", icon: "wifi" },
  { name: "Air Conditioning", slug: "air-conditioning", category: "BASIC", icon: "ac" },
  { name: "Heating", slug: "heating", category: "BASIC", icon: "heating" },
  { name: "Washer", slug: "washer", category: "BASIC", icon: "washer" },
  { name: "Dryer", slug: "dryer", category: "BASIC", icon: "dryer" },
  { name: "Iron", slug: "iron", category: "BASIC", icon: "iron" },
  { name: "Hair Dryer", slug: "hair-dryer", category: "BASIC", icon: "hair-dryer" },
  { name: "Hangers", slug: "hangers", category: "BASIC", icon: "hangers" },
  { name: "Bed Linens", slug: "bed-linens", category: "BASIC", icon: "bed-linens" },
  { name: "Extra Pillows", slug: "extra-pillows", category: "BASIC", icon: "pillows" },
  { name: "Towels", slug: "towels", category: "BASIC", icon: "towels" },
  { name: "Smoke Detector", slug: "smoke-detector", category: "SAFETY", icon: "smoke-detector" },
  { name: "Carbon Monoxide Detector", slug: "carbon-monoxide-detector", category: "SAFETY", icon: "co-detector" },
  { name: "Fire Extinguisher", slug: "fire-extinguisher", category: "SAFETY", icon: "fire-extinguisher" },
  { name: "First Aid Kit", slug: "first-aid-kit", category: "SAFETY", icon: "first-aid" },
  { name: "Security Camera", slug: "security-camera", category: "SAFETY", icon: "security-camera" },
  { name: "Safe / Lockbox", slug: "safe-lockbox", category: "SAFETY", icon: "safe" },
  { name: "Pool", slug: "pool", category: "OUTDOOR", icon: "pool" },
  { name: "Hot Tub", slug: "hot-tub", category: "OUTDOOR", icon: "hot-tub" },
  { name: "Patio", slug: "patio", category: "OUTDOOR", icon: "patio" },
  { name: "Balcony", slug: "balcony", category: "OUTDOOR", icon: "balcony" },
  { name: "Garden", slug: "garden", category: "OUTDOOR", icon: "garden" },
  { name: "BBQ Grill", slug: "bbq-grill", category: "OUTDOOR", icon: "bbq" },
  { name: "Full Kitchen", slug: "full-kitchen", category: "KITCHEN", icon: "kitchen" },
  { name: "Kitchenette", slug: "kitchenette", category: "KITCHEN", icon: "kitchenette" },
  { name: "Refrigerator", slug: "refrigerator", category: "KITCHEN", icon: "refrigerator" },
  { name: "Microwave", slug: "microwave", category: "KITCHEN", icon: "microwave" },
  { name: "Dishwasher", slug: "dishwasher", category: "KITCHEN", icon: "dishwasher" },
  { name: "Coffee Maker", slug: "coffee-maker", category: "KITCHEN", icon: "coffee" },
  { name: "Oven", slug: "oven", category: "KITCHEN", icon: "oven" },
  { name: "Stove", slug: "stove", category: "KITCHEN", icon: "stove" },
  { name: "TV", slug: "tv", category: "ENTERTAINMENT", icon: "tv" },
  { name: "Streaming Services", slug: "streaming-services", category: "ENTERTAINMENT", icon: "streaming" },
  { name: "Board Games", slug: "board-games", category: "ENTERTAINMENT", icon: "games" },
  { name: "Books", slug: "books", category: "ENTERTAINMENT", icon: "books" },
  { name: "Gym / Fitness Center", slug: "gym", category: "ENTERTAINMENT", icon: "gym" },
  { name: "Wheelchair Accessible", slug: "wheelchair-accessible", category: "ACCESSIBILITY", icon: "wheelchair" },
  { name: "Elevator", slug: "elevator", category: "ACCESSIBILITY", icon: "elevator" },
  { name: "Step-Free Access", slug: "step-free-access", category: "ACCESSIBILITY", icon: "step-free" },
  { name: "Wide Doorways", slug: "wide-doorways", category: "ACCESSIBILITY", icon: "wide-door" },
  { name: "Free Parking", slug: "free-parking", category: "PARKING", icon: "parking-free" },
  { name: "Paid Parking", slug: "paid-parking", category: "PARKING", icon: "parking-paid" },
  { name: "Garage", slug: "garage", category: "PARKING", icon: "garage" },
  { name: "Street Parking", slug: "street-parking", category: "PARKING", icon: "parking-street" },
  { name: "EV Charger", slug: "ev-charger", category: "PARKING", icon: "ev-charger" },
  { name: "Central Heating", slug: "central-heating", category: "CLIMATE", icon: "central-heating" },
  { name: "Fireplace", slug: "fireplace", category: "CLIMATE", icon: "fireplace" },
  { name: "Ceiling Fan", slug: "ceiling-fan", category: "CLIMATE", icon: "ceiling-fan" },
  { name: "Portable Fan", slug: "portable-fan", category: "CLIMATE", icon: "portable-fan" },
  { name: "Hammock", slug: "hammock", category: "OUTDOOR", icon: "hammock" },
  { name: "Fire Pit", slug: "fire-pit", category: "OUTDOOR", icon: "fire-pit" },
  { name: "Self Check-in / Keyless Entry", slug: "self-check-in", category: "SAFETY", icon: "keyless-entry" },
  { name: "Pets Allowed", slug: "pets-allowed", category: "BASIC", icon: "pets-allowed" },
];

const CLD = "https://res.cloudinary.com/lbwzvp5s/image/upload";
const CLD_EXTRA = `${CLD}/potomac/listings`;

const listingsData = [
  {
    title: "Sunlit Modern Apartment in Downtown Manhattan",
    propertyType: "Apartment", rentalType: "SHORT_TERM" as const,
    city: "New York", region: "NY", line1: "245 East 24th Street", postalCode: "10010",
    lat: 40.7394, lng: -73.9821,
    nightlyPrice: 189, bedrooms: 1, bathrooms: 1, maxOccupants: 3,
    amenitySlugs: ["wifi", "air-conditioning", "elevator", "tv", "coffee-maker", "washer"],
    avgRating: 4.7, reviewCount: 42,
    description: "Step into this beautifully renovated one-bedroom apartment in the heart of Manhattan. Floor-to-ceiling windows flood the space with natural light, while the modern kitchen and rainfall shower make every stay feel like a luxury retreat. Walk to Union Square, Gramercy Park, and dozens of restaurants within minutes.",
    images: [
      `${CLD}/listings/seed_property_1.jpg`,
      `${CLD}/listings/seed_property_26.jpg`,
      `${CLD_EXTRA}/seed_property_extra_0_a.jpg`,
      `${CLD_EXTRA}/seed_property_extra_0_b.jpg`,
    ],
  },
  {
    title: "Beachfront Villa with Private Pool in Miami",
    propertyType: "Villa", rentalType: "SHORT_TERM" as const,
    city: "Miami", region: "FL", line1: "1200 Ocean Drive", postalCode: "33139",
    lat: 25.7825, lng: -80.1304,
    nightlyPrice: 475, bedrooms: 4, bathrooms: 3, maxOccupants: 10,
    amenitySlugs: ["wifi", "pool", "air-conditioning", "free-parking", "bbq-grill", "full-kitchen", "tv", "washer", "dryer"],
    avgRating: 4.9, reviewCount: 87,
    description: "Wake up to the sound of waves in this stunning beachfront villa. Featuring a private infinity pool, spacious outdoor terrace with BBQ, and direct beach access. Four bedrooms each with en-suite bathrooms make this the perfect retreat for families or groups. Just steps from South Beach's legendary nightlife and dining.",
    images: [
      `${CLD}/listings/seed_property_2.jpg`,
      `${CLD}/listings/seed_property_15.jpg`,
      `${CLD_EXTRA}/seed_property_extra_1_a.jpg`,
      `${CLD_EXTRA}/seed_property_extra_1_b.jpg`,
    ],
  },
  {
    title: "Cozy Mountain Cabin in Asheville",
    propertyType: "Cabin", rentalType: "SHORT_TERM" as const,
    city: "Asheville", region: "NC", line1: "88 Mountain View Road", postalCode: "28801",
    lat: 35.5951, lng: -82.5515,
    nightlyPrice: 145, bedrooms: 2, bathrooms: 1, maxOccupants: 5,
    amenitySlugs: ["wifi", "fireplace", "free-parking", "patio", "full-kitchen", "coffee-maker", "books"],
    avgRating: 4.8, reviewCount: 63,
    description: "Escape to this charming mountain cabin nestled among the Blue Ridge Mountains. Curl up by the stone fireplace, enjoy morning coffee on the wraparound porch with panoramic views, or explore nearby hiking trails and waterfalls. The perfect blend of rustic charm and modern comfort.",
    images: [
      `${CLD}/listings/seed_property_19.jpg`,
      `${CLD}/listings/seed_property_17.jpg`,
      `${CLD_EXTRA}/seed_property_extra_2_a.jpg`,
      `${CLD_EXTRA}/seed_property_extra_2_b.jpg`,
    ],
  },
  {
    title: "Luxury Penthouse with Skyline Views in Chicago",
    propertyType: "Penthouse", rentalType: "SHORT_TERM" as const,
    city: "Chicago", region: "IL", line1: "401 North Wabash Avenue", postalCode: "60611",
    lat: 41.8896, lng: -87.6269,
    nightlyPrice: 395, bedrooms: 3, bathrooms: 2, maxOccupants: 6,
    amenitySlugs: ["wifi", "air-conditioning", "elevator", "gym", "tv", "dishwasher", "washer", "dryer", "balcony"],
    avgRating: 4.9, reviewCount: 31,
    description: "Experience Chicago from the top floor of this stunning penthouse overlooking the Magnificent Mile. Floor-to-ceiling windows frame breathtaking views of Lake Michigan and the city skyline. The gourmet kitchen, spa-like bathrooms, and private balcony make this the ultimate urban retreat.",
    images: [
      `${CLD}/listings/seed_property_4.jpg`,
      `${CLD}/listings/seed_property_3.jpg`,
      `${CLD_EXTRA}/seed_property_extra_3_a.jpg`,
      `${CLD_EXTRA}/seed_property_extra_3_b.jpg`,
    ],
  },
  {
    title: "Charming Cottage in Savannah Historic District",
    propertyType: "Cottage", rentalType: "SHORT_TERM" as const,
    city: "Savannah", region: "GA", line1: "514 East Jones Street", postalCode: "31401",
    lat: 32.0693, lng: -81.0912,
    nightlyPrice: 135, bedrooms: 2, bathrooms: 1, maxOccupants: 4,
    amenitySlugs: ["wifi", "air-conditioning", "garden", "free-parking", "full-kitchen", "washer", "patio"],
    avgRating: 4.6, reviewCount: 55,
    description: "Stay in one of Savannah's most photographed streets in this beautifully restored 1890s cottage. Original hardwood floors, exposed brick, and a private courtyard garden create an atmosphere of Southern elegance. Walk to Forsyth Park, River Street, and the best restaurants in the historic district.",
    images: [
      `${CLD}/listings/seed_property_20.jpg`,
      `${CLD}/listings/seed_property_25.jpg`,
      `${CLD_EXTRA}/seed_property_extra_4_a.jpg`,
      `${CLD_EXTRA}/seed_property_extra_4_b.jpg`,
    ],
  },
  {
    title: "Modern Loft in Arts District Los Angeles",
    propertyType: "Loft", rentalType: "SHORT_TERM" as const,
    city: "Los Angeles", region: "CA", line1: "950 East 3rd Street", postalCode: "90013",
    lat: 34.0407, lng: -118.2327,
    nightlyPrice: 225, bedrooms: 1, bathrooms: 1, maxOccupants: 3,
    amenitySlugs: ["wifi", "air-conditioning", "coffee-maker", "tv", "streaming-services", "street-parking"],
    avgRating: 4.5, reviewCount: 38,
    description: "This converted warehouse loft in LA's vibrant Arts District features 16-foot ceilings, polished concrete floors, and walls of industrial windows. The open-plan living space is filled with curated art and designer furniture. Steps from world-class galleries, craft breweries, and some of the city's best dining.",
    images: [
      `${CLD}/listings/seed_property_6.jpg`,
      `${CLD}/listings/seed_property_30.jpg`,
      `${CLD_EXTRA}/seed_property_extra_5_a.jpg`,
      `${CLD_EXTRA}/seed_property_extra_5_b.jpg`,
    ],
  },
  {
    title: "Waterfront Bungalow in Charleston",
    propertyType: "Bungalow", rentalType: "SHORT_TERM" as const,
    city: "Charleston", region: "SC", line1: "27 East Battery", postalCode: "29401",
    lat: 32.7690, lng: -79.9286,
    nightlyPrice: 165, bedrooms: 2, bathrooms: 2, maxOccupants: 4,
    amenitySlugs: ["wifi", "air-conditioning", "patio", "free-parking", "full-kitchen", "coffee-maker", "washer", "balcony"],
    avgRating: 4.7, reviewCount: 49,
    description: "This lovingly restored bungalow sits on Charleston's famous Battery, with sweeping views of the harbor. The wraparound porch is perfect for watching sunsets over Fort Sumter. Two bedrooms, each with its own bathroom, plus a fully equipped kitchen with local coffee and tea. Walk to King Street shopping and Rainbow Row.",
    images: [
      `${CLD}/listings/seed_property_8.jpg`,
      `${CLD}/listings/seed_property_21.jpg`,
      `${CLD_EXTRA}/seed_property_extra_6_a.jpg`,
      `${CLD_EXTRA}/seed_property_extra_6_b.jpg`,
    ],
  },
  {
    title: "Desert Retreat Studio in Scottsdale",
    propertyType: "Studio", rentalType: "SHORT_TERM" as const,
    city: "Scottsdale", region: "AZ", line1: "7340 East Indian Bend Road", postalCode: "85250",
    lat: 33.5384, lng: -111.9261,
    nightlyPrice: 110, bedrooms: 0, bathrooms: 1, maxOccupants: 2,
    amenitySlugs: ["wifi", "air-conditioning", "pool", "free-parking", "kitchenette", "tv"],
    avgRating: 4.4, reviewCount: 22,
    description: "A tranquil desert studio with access to a shared resort-style pool and hot tub. The minimalist design features floor-to-ceiling desert views, a comfortable queen bed, and a well-appointed kitchenette. Perfect as a base for exploring Camelback Mountain, Old Town Scottsdale, and the Sonoran Desert.",
    images: [
      `${CLD}/listings/seed_property_9.jpg`,
      `${CLD}/listings/seed_property_7.jpg`,
      `${CLD_EXTRA}/seed_property_extra_7_a.jpg`,
      `${CLD_EXTRA}/seed_property_extra_7_b.jpg`,
    ],
  },
  {
    title: "Historic Townhouse in Georgetown DC",
    propertyType: "Townhouse", rentalType: "SHORT_TERM" as const,
    city: "Washington", region: "DC", line1: "3251 Prospect Street NW", postalCode: "20007",
    lat: 38.9053, lng: -77.0659,
    nightlyPrice: 275, bedrooms: 3, bathrooms: 2, maxOccupants: 6,
    amenitySlugs: ["wifi", "air-conditioning", "full-kitchen", "washer", "dryer", "garden", "tv", "books", "fireplace"],
    avgRating: 4.8, reviewCount: 36,
    description: "A beautifully appointed Federal-style townhouse in the heart of Georgetown. Three floors of elegant living with original fireplaces, a chef's kitchen, and a private walled garden. Walk to Georgetown's shops, restaurants, the C&O Canal, and the waterfront. A true Washington, DC experience.",
    images: [
      `${CLD}/listings/seed_property_13.jpg`,
      `${CLD}/listings/seed_property_12.jpg`,
      `${CLD_EXTRA}/seed_property_extra_8_a.jpg`,
      `${CLD_EXTRA}/seed_property_extra_8_b.jpg`,
    ],
  },
  {
    title: "Oceanview Condo in San Diego",
    propertyType: "Condo", rentalType: "SHORT_TERM" as const,
    city: "San Diego", region: "CA", line1: "1780 Avenida del Mundo", postalCode: "92101",
    lat: 32.7233, lng: -117.1685,
    nightlyPrice: 210, bedrooms: 2, bathrooms: 2, maxOccupants: 5,
    amenitySlugs: ["wifi", "air-conditioning", "pool", "gym", "elevator", "balcony", "full-kitchen", "tv", "free-parking"],
    avgRating: 4.6, reviewCount: 44,
    description: "This bright corner unit offers panoramic ocean views from a private balcony. The open-concept living area flows into a modern kitchen with granite countertops. Building amenities include a rooftop pool, fitness center, and concierge. Steps from the Gaslamp Quarter, Petco Park, and the harbor.",
    images: [
      `${CLD}/listings/seed_property_11.jpg`,
      `${CLD}/listings/seed_property_14.jpg`,
      `${CLD_EXTRA}/seed_property_extra_9_a.jpg`,
      `${CLD_EXTRA}/seed_property_extra_9_b.jpg`,
    ],
  },
  {
    title: "Spacious Family House in Austin",
    propertyType: "House", rentalType: "LONG_TERM" as const,
    city: "Austin", region: "TX", line1: "2407 East Cesar Chavez Street", postalCode: "78702",
    lat: 30.2563, lng: -97.7250,
    monthlyRent: 2800, bedrooms: 3, bathrooms: 2, maxOccupants: 6,
    amenitySlugs: ["wifi", "air-conditioning", "free-parking", "garden", "full-kitchen", "washer", "dryer", "garage", "patio"],
    avgRating: 4.7, reviewCount: 18,
    description: "A beautifully updated three-bedroom home in East Austin's most desirable neighborhood. The open-plan living and dining area opens onto a large backyard with mature trees and a covered patio — perfect for entertaining. Two-car garage, walking distance to restaurants, cafes, and Lady Bird Lake trails. Available for 12+ month lease.",
    utilitiesIncluded: false,
    images: [
      `${CLD}/listings/seed_property_5.jpg`,
      `${CLD}/listings/seed_property_22.jpg`,
      `${CLD_EXTRA}/seed_property_extra_10_a.jpg`,
      `${CLD_EXTRA}/seed_property_extra_10_b.jpg`,
    ],
  },
  {
    title: "Modern Downtown Apartment in Denver",
    propertyType: "Apartment", rentalType: "LONG_TERM" as const,
    city: "Denver", region: "CO", line1: "1600 Glenarm Place", postalCode: "80202",
    lat: 39.7439, lng: -104.9877,
    monthlyRent: 2200, bedrooms: 1, bathrooms: 1, maxOccupants: 2,
    amenitySlugs: ["wifi", "air-conditioning", "elevator", "gym", "tv", "washer", "dryer", "dishwasher"],
    avgRating: 4.5, reviewCount: 12,
    description: "Live in the heart of downtown Denver in this sleek one-bedroom apartment. The building features a rooftop deck with mountain views, a state-of-the-art fitness center, and in-unit laundry. Walk to Union Station, Coors Field, and the 16th Street Mall. Ideal for young professionals. 12-month minimum lease.",
    utilitiesIncluded: true,
    images: [
      `${CLD}/listings/seed_property_16.jpg`,
      `${CLD}/listings/seed_property_10.jpg`,
      `${CLD_EXTRA}/seed_property_extra_11_a.jpg`,
      `${CLD_EXTRA}/seed_property_extra_11_b.jpg`,
    ],
  },
  {
    title: "Farmhouse Retreat in Hudson Valley",
    propertyType: "Farmhouse", rentalType: "SHORT_TERM" as const,
    city: "Hudson", region: "NY", line1: "1045 Route 9H", postalCode: "12534",
    lat: 42.2529, lng: -73.7907,
    nightlyPrice: 195, bedrooms: 3, bathrooms: 2, maxOccupants: 7,
    amenitySlugs: ["wifi", "fireplace", "free-parking", "garden", "full-kitchen", "patio", "bbq-grill", "books", "board-games"],
    avgRating: 4.9, reviewCount: 71,
    description: "Escape to this restored 1840s farmhouse on 12 acres in the scenic Hudson Valley. Three bedrooms, two fireplaces, a farmhouse kitchen, and wraparound porch with views of rolling pastures. Pick apples in the orchard, hike nearby trails, or visit the charming town of Hudson's antique shops and farm-to-table restaurants.",
    images: [
      `${CLD}/listings/seed_property_18.jpg`,
      `${CLD}/listings/seed_property_24.jpg`,
      `${CLD_EXTRA}/seed_property_extra_12_a.jpg`,
      `${CLD_EXTRA}/seed_property_extra_12_b.jpg`,
    ],
  },
  {
    title: "Elegant Duplex in Boston Back Bay",
    propertyType: "Duplex", rentalType: "LONG_TERM" as const,
    city: "Boston", region: "MA", line1: "312 Commonwealth Avenue", postalCode: "02115",
    lat: 42.3516, lng: -71.0841,
    monthlyRent: 3500, bedrooms: 2, bathrooms: 2, maxOccupants: 4,
    amenitySlugs: ["wifi", "central-heating", "washer", "dryer", "full-kitchen", "fireplace", "street-parking"],
    avgRating: 4.8, reviewCount: 9,
    description: "A rare two-floor duplex on one of Boston's most prestigious streets. The lower level features an open living and dining area with bay windows and a working fireplace; the upper level has two spacious bedrooms with original crown molding. Walking distance to the Esplanade, Newbury Street, and the T. 12-month lease.",
    utilitiesIncluded: false,
    images: [
      `${CLD}/listings/seed_property_27.jpg`,
      `${CLD}/listings/seed_property_29.jpg`,
      `${CLD_EXTRA}/seed_property_extra_13_a.jpg`,
      `${CLD_EXTRA}/seed_property_extra_13_b.jpg`,
    ],
  },
  {
    title: "Tropical Guest House in Key West",
    propertyType: "Guest House", rentalType: "SHORT_TERM" as const,
    city: "Key West", region: "FL", line1: "623 Southard Street", postalCode: "33040",
    lat: 24.5584, lng: -81.7970,
    nightlyPrice: 155, bedrooms: 1, bathrooms: 1, maxOccupants: 2,
    amenitySlugs: ["wifi", "air-conditioning", "pool", "patio", "kitchenette", "coffee-maker", "tv"],
    avgRating: 4.6, reviewCount: 58,
    description: "A private guest house in a lush tropical compound just two blocks from Duval Street. The detached cottage features its own entrance, a queen bed with luxury linens, and a kitchenette. Cool off in the shared saltwater pool surrounded by palm trees and bougainvillea. The quintessential Key West experience.",
    images: [
      `${CLD}/listings/seed_property_23.jpg`,
      `${CLD}/listings/seed_property_28.jpg`,
      `${CLD_EXTRA}/seed_property_extra_14_a.jpg`,
      `${CLD_EXTRA}/seed_property_extra_14_b.jpg`,
    ],
  },
];

async function main() {
  console.log("Seeding database...");

  for (const pt of propertyTypes) {
    await prisma.propertyType.upsert({
      where: { slug: pt.slug },
      update: { name: pt.name, description: pt.description, icon: pt.icon },
      create: pt,
    });
  }
  console.log(`  Property types: ${propertyTypes.length} upserted`);

  for (const amenity of amenities) {
    await prisma.amenity.upsert({
      where: { slug: amenity.slug },
      update: { name: amenity.name, category: amenity.category, icon: amenity.icon },
      create: amenity,
    });
  }
  console.log(`  Amenities: ${amenities.length} upserted`);

  // --- Seed host & listings ---
  const passwordHash = await bcrypt.hash("PotomacHost2026!", 12);
  const host = await prisma.user.upsert({
    where: { email: "host@potomac-demo.com" },
    update: {},
    create: {
      email: "host@potomac-demo.com",
      passwordHash,
      firstName: "Potomac",
      lastName: "Homes",
      roles: ["CUSTOMER", "HOST"],
      isVerified: true,
      bio: "Professional property manager offering premium stays across the United States.",
    },
  });
  console.log(`  Host user: ${host.email}`);

  const adminPasswordHash = await bcrypt.hash("PotomacAdmin2026!", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@potomac-demo.com" },
    update: {},
    create: {
      email: "admin@potomac-demo.com",
      passwordHash: adminPasswordHash,
      firstName: "Potomac",
      lastName: "Admin",
      roles: ["CUSTOMER", "ADMIN"],
      isVerified: true,
    },
  });
  console.log(`  Admin user: ${admin.email}`);

  const allPropTypes = await prisma.propertyType.findMany();
  const ptByName = (n: string) => allPropTypes.find((p) => p.name === n)!.id;
  const allAmenities = await prisma.amenity.findMany();
  const amenityId = (slug: string) => allAmenities.find((a) => a.slug === slug)?.id;

  let created = 0;
  let skipped = 0;
  let imagesBackfilled = 0;
  for (const [i, data] of Array.from(listingsData.entries())) {
    const slug = data.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const existing = await prisma.listing.findUnique({ where: { slug } });
    if (existing) {
      const existingImageCount = await prisma.image.count({ where: { listingId: existing.id } });
      if (existingImageCount < data.images.length) {
        await prisma.image.deleteMany({ where: { listingId: existing.id } });
        await prisma.image.createMany({
          data: data.images.map((url, pos) => ({
            listingId: existing.id,
            url,
            publicId: url.replace(`${CLD}/`, "").replace(/\.jpg$/, ""),
            position: pos,
            isCover: pos === 0,
          })),
        });
        imagesBackfilled++;
      }
      skipped++;
      continue;
    }

    const amenityIds = data.amenitySlugs
      .map((s: string) => amenityId(s))
      .filter((id): id is string => !!id);

    await prisma.listing.create({
      data: {
        hostId: host.id,
        propertyTypeId: ptByName(data.propertyType),
        title: data.title,
        slug,
        description: data.description,
        rentalType: data.rentalType,
        bedrooms: data.bedrooms,
        bathrooms: data.bathrooms,
        maxOccupants: data.maxOccupants,
        currency: "USD",
        status: "PUBLISHED",
        publishedAt: new Date(Date.now() - i * 1000 * 60 * 60 * 24 * 3),
        avgRating: data.avgRating,
        reviewCount: data.reviewCount,
        ...(data.rentalType === "SHORT_TERM"
          ? {
              nightlyPrice: data.nightlyPrice,
              minNights: 1,
              checkInTime: "15:00",
              checkOutTime: "11:00",
              cancellationPolicy: "MODERATE",
              instantBook: true,
            }
          : {
              monthlyRent: (data as any).monthlyRent,
              minLeaseTermMonths: 12,
              petPolicy: "CASE_BY_CASE",
              earlyTerminationPolicy: "STANDARD",
              utilitiesIncluded: (data as any).utilitiesIncluded ?? false,
            }),
        address: {
          create: {
            line1: data.line1,
            city: data.city,
            region: data.region,
            postalCode: data.postalCode,
            country: "US",
            latitude: data.lat,
            longitude: data.lng,
          },
        },
        amenities: {
          create: amenityIds.map((aid) => ({ amenityId: aid })),
        },
        images: {
          create: data.images.map((url, pos) => ({
            url,
            publicId: url.replace(`${CLD}/`, "").replace(/\.jpg$/, ""),
            position: pos,
            isCover: pos === 0,
          })),
        },
      },
    });
    created++;
  }
  console.log(`  Listings: ${created} created, ${skipped} already existed (${imagesBackfilled} had images backfilled)`);

  console.log("Seeding complete.");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
