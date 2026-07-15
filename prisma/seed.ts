import { PrismaClient, AmenityCategory } from "@prisma/client";

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
  // Basic
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
  // Safety
  { name: "Smoke Detector", slug: "smoke-detector", category: "SAFETY", icon: "smoke-detector" },
  { name: "Carbon Monoxide Detector", slug: "carbon-monoxide-detector", category: "SAFETY", icon: "co-detector" },
  { name: "Fire Extinguisher", slug: "fire-extinguisher", category: "SAFETY", icon: "fire-extinguisher" },
  { name: "First Aid Kit", slug: "first-aid-kit", category: "SAFETY", icon: "first-aid" },
  { name: "Security Camera", slug: "security-camera", category: "SAFETY", icon: "security-camera" },
  { name: "Safe / Lockbox", slug: "safe-lockbox", category: "SAFETY", icon: "safe" },
  // Outdoor
  { name: "Pool", slug: "pool", category: "OUTDOOR", icon: "pool" },
  { name: "Hot Tub", slug: "hot-tub", category: "OUTDOOR", icon: "hot-tub" },
  { name: "Patio", slug: "patio", category: "OUTDOOR", icon: "patio" },
  { name: "Balcony", slug: "balcony", category: "OUTDOOR", icon: "balcony" },
  { name: "Garden", slug: "garden", category: "OUTDOOR", icon: "garden" },
  { name: "BBQ Grill", slug: "bbq-grill", category: "OUTDOOR", icon: "bbq" },
  // Kitchen
  { name: "Full Kitchen", slug: "full-kitchen", category: "KITCHEN", icon: "kitchen" },
  { name: "Kitchenette", slug: "kitchenette", category: "KITCHEN", icon: "kitchenette" },
  { name: "Refrigerator", slug: "refrigerator", category: "KITCHEN", icon: "refrigerator" },
  { name: "Microwave", slug: "microwave", category: "KITCHEN", icon: "microwave" },
  { name: "Dishwasher", slug: "dishwasher", category: "KITCHEN", icon: "dishwasher" },
  { name: "Coffee Maker", slug: "coffee-maker", category: "KITCHEN", icon: "coffee" },
  { name: "Oven", slug: "oven", category: "KITCHEN", icon: "oven" },
  { name: "Stove", slug: "stove", category: "KITCHEN", icon: "stove" },
  // Entertainment
  { name: "TV", slug: "tv", category: "ENTERTAINMENT", icon: "tv" },
  { name: "Streaming Services", slug: "streaming-services", category: "ENTERTAINMENT", icon: "streaming" },
  { name: "Board Games", slug: "board-games", category: "ENTERTAINMENT", icon: "games" },
  { name: "Books", slug: "books", category: "ENTERTAINMENT", icon: "books" },
  { name: "Gym / Fitness Center", slug: "gym", category: "ENTERTAINMENT", icon: "gym" },
  // Accessibility
  { name: "Wheelchair Accessible", slug: "wheelchair-accessible", category: "ACCESSIBILITY", icon: "wheelchair" },
  { name: "Elevator", slug: "elevator", category: "ACCESSIBILITY", icon: "elevator" },
  { name: "Step-Free Access", slug: "step-free-access", category: "ACCESSIBILITY", icon: "step-free" },
  { name: "Wide Doorways", slug: "wide-doorways", category: "ACCESSIBILITY", icon: "wide-door" },
  // Parking
  { name: "Free Parking", slug: "free-parking", category: "PARKING", icon: "parking-free" },
  { name: "Paid Parking", slug: "paid-parking", category: "PARKING", icon: "parking-paid" },
  { name: "Garage", slug: "garage", category: "PARKING", icon: "garage" },
  { name: "Street Parking", slug: "street-parking", category: "PARKING", icon: "parking-street" },
  { name: "EV Charger", slug: "ev-charger", category: "PARKING", icon: "ev-charger" },
  // Climate
  { name: "Central Heating", slug: "central-heating", category: "CLIMATE", icon: "central-heating" },
  { name: "Fireplace", slug: "fireplace", category: "CLIMATE", icon: "fireplace" },
  { name: "Ceiling Fan", slug: "ceiling-fan", category: "CLIMATE", icon: "ceiling-fan" },
  { name: "Portable Fan", slug: "portable-fan", category: "CLIMATE", icon: "portable-fan" },
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

  console.log("Seeding complete.");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
