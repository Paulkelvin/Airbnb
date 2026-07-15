/**
 * DEVELOPMENT-ONLY seed data — realistic but fake listings used to exercise
 * search/filter/sort locally. This must never run against a real deployment.
 *
 * Guarded three ways, all of which must pass:
 *   1. NODE_ENV must not be "production"
 *   2. VERCEL_ENV must not be "production" or "preview"
 *   3. The caller must explicitly set ALLOW_DEV_SEED=1
 *
 * Run locally with: ALLOW_DEV_SEED=1 npm run db:seed:dev
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

if (process.env.NODE_ENV === "production") {
  console.error("Refusing to run: NODE_ENV is production.");
  process.exit(1);
}

if (process.env.VERCEL_ENV === "production" || process.env.VERCEL_ENV === "preview") {
  console.error(`Refusing to run: VERCEL_ENV is "${process.env.VERCEL_ENV}".`);
  process.exit(1);
}

if (process.env.ALLOW_DEV_SEED !== "1") {
  console.error(
    "Refusing to run: this seeds fake demo listings for local development only.\n" +
      "Set ALLOW_DEV_SEED=1 to confirm you intend to run it against the database " +
      "your DATABASE_URL currently points at.",
  );
  process.exit(1);
}

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("TestPass123", 12);
  const host = await prisma.user.upsert({
    where: { email: "search-test-host@example.com" },
    update: {},
    create: {
      email: "search-test-host@example.com",
      passwordHash,
      firstName: "Search",
      lastName: "Tester",
      roles: ["CUSTOMER", "HOST"],
    },
  });

  const propertyTypes = await prisma.propertyType.findMany();
  const byName = (n: string) => propertyTypes.find((p) => p.name === n)!.id;

  const amenities = await prisma.amenity.findMany();
  const amenityIdBySlug = (slug: string) => amenities.find((a) => a.slug === slug)!.id;

  const listingsData = [
    {
      title: "Sunny Loft Near the Park Chicago",
      rentalType: "SHORT_TERM" as const,
      propertyType: "Apartment",
      city: "Chicago",
      region: "IL",
      lat: 41.8781,
      lng: -87.6298,
      nightlyPrice: 120,
      bedrooms: 1,
      bathrooms: 1,
      maxOccupants: 2,
      amenitySlugs: ["wifi", "air-conditioning", "washer"],
      avgRating: 4.5,
      reviewCount: 12,
      description: "A bright airy loft with skyline views, walkable to the park and downtown Chicago attractions.",
    },
    {
      title: "Cozy Cottage Springfield Retreat",
      rentalType: "SHORT_TERM" as const,
      propertyType: "Cottage",
      city: "Springfield",
      region: "IL",
      lat: 39.7817,
      lng: -89.6501,
      nightlyPrice: 85,
      bedrooms: 2,
      bathrooms: 1,
      maxOccupants: 4,
      amenitySlugs: ["wifi", "free-parking", "fireplace"],
      avgRating: 4.8,
      reviewCount: 27,
      description: "Quiet cottage retreat with a fireplace, perfect for a peaceful getaway near Springfield.",
    },
    {
      title: "Luxury Villa Miami Beachfront",
      rentalType: "SHORT_TERM" as const,
      propertyType: "Villa",
      city: "Miami",
      region: "FL",
      lat: 25.7617,
      lng: -80.1918,
      nightlyPrice: 450,
      bedrooms: 4,
      bathrooms: 3,
      maxOccupants: 8,
      amenitySlugs: ["wifi", "pool", "air-conditioning", "free-parking"],
      avgRating: 4.9,
      reviewCount: 54,
      description: "Stunning beachfront villa with private pool, steps from the sand in sunny Miami.",
    },
    {
      title: "Downtown Studio Chicago Budget Stay",
      rentalType: "SHORT_TERM" as const,
      propertyType: "Studio",
      city: "Chicago",
      region: "IL",
      lat: 41.8825,
      lng: -87.6233,
      nightlyPrice: 60,
      bedrooms: 0,
      bathrooms: 1,
      maxOccupants: 1,
      amenitySlugs: ["wifi"],
      avgRating: 3.9,
      reviewCount: 8,
      description: "Simple budget-friendly studio in the heart of downtown Chicago, close to transit.",
    },
    {
      title: "Modern Condo Springfield Family Home",
      rentalType: "LONG_TERM" as const,
      propertyType: "Condo",
      city: "Springfield",
      region: "IL",
      lat: 39.7900,
      lng: -89.6440,
      monthlyRent: 1800,
      bedrooms: 3,
      bathrooms: 2,
      maxOccupants: 5,
      amenitySlugs: ["wifi", "dishwasher", "free-parking"],
      avgRating: 4.6,
      reviewCount: 15,
      description: "Spacious modern condo ideal for families, in a quiet Springfield neighborhood with great schools.",
      utilitiesIncluded: true,
    },
    {
      title: "Compact Apartment Miami Long Term Lease",
      rentalType: "LONG_TERM" as const,
      propertyType: "Apartment",
      city: "Miami",
      region: "FL",
      lat: 25.7700,
      lng: -80.1950,
      monthlyRent: 2200,
      bedrooms: 1,
      bathrooms: 1,
      maxOccupants: 2,
      amenitySlugs: ["wifi", "pool", "gym"],
      avgRating: 4.2,
      reviewCount: 6,
      description: "Well-appointed apartment near Miami's business district, available for long-term lease.",
      utilitiesIncluded: false,
    },
  ];

  for (const [i, data] of Array.from(listingsData.entries())) {
    const slug = data.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

    const existing = await prisma.listing.findUnique({ where: { slug } });
    if (existing) {
      console.log("Skipping existing:", slug);
      continue;
    }

    const listing = await prisma.listing.create({
      data: {
        hostId: host.id,
        propertyTypeId: byName(data.propertyType),
        title: data.title,
        slug,
        description: data.description,
        rentalType: data.rentalType,
        bedrooms: data.bedrooms,
        bathrooms: data.bathrooms,
        maxOccupants: data.maxOccupants,
        currency: "USD",
        status: "PUBLISHED",
        publishedAt: new Date(Date.now() - i * 1000 * 60 * 60 * 24), // stagger for newest-sort testing
        avgRating: data.avgRating,
        reviewCount: data.reviewCount,
        ...(data.rentalType === "SHORT_TERM"
          ? {
              nightlyPrice: data.nightlyPrice,
              minNights: 1,
              checkInTime: "15:00",
              checkOutTime: "11:00",
              cancellationPolicy: "MODERATE",
              instantBook: false,
            }
          : {
              monthlyRent: data.monthlyRent,
              minLeaseTermMonths: 12,
              petPolicy: "ALLOWED",
              earlyTerminationPolicy: "STANDARD",
              utilitiesIncluded: (data as { utilitiesIncluded?: boolean }).utilitiesIncluded ?? false,
            }),
        address: {
          create: {
            line1: "123 Test St",
            city: data.city,
            region: data.region,
            postalCode: "00000",
            country: "US",
            latitude: data.lat,
            longitude: data.lng,
          },
        },
        amenities: {
          create: data.amenitySlugs.map((amenitySlug: string) => ({
            amenityId: amenityIdBySlug(amenitySlug),
          })),
        },
        images: {
          create: [
            {
              url: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688",
              publicId: `seed/${slug}`,
              position: 0,
              isCover: true,
            },
          ],
        },
      },
    });
    console.log("Created:", listing.title, listing.id);
  }

  console.log("\nDone.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
