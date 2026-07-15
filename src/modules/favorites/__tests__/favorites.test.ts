import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { toggleFavorite } from "../actions";
import { getMyFavoriteListings, isFavorited, getFavoritedListingIds } from "../queries";

const USER_ID = "5e9c2d6e-6fab-4a5b-d17d-1bcd5a4e9d55";
const PROPERTY_TYPE_ID = "6fad3e7f-70ac-4b6c-e28e-2cde6b5faf66";

let listingAId: string;
let listingBId: string;

vi.mock("@/lib/auth", () => ({ requireAuth: vi.fn().mockResolvedValue({ id: "5e9c2d6e-6fab-4a5b-d17d-1bcd5a4e9d55", roles: ["CUSTOMER"] }) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

beforeAll(async () => {
  await prisma.user.upsert({
    where: { id: USER_ID },
    create: { id: USER_ID, email: "favtest-user@example.com", firstName: "Fav", lastName: "Test", roles: ["CUSTOMER"] },
    update: {},
  });
  await prisma.propertyType.upsert({
    where: { id: PROPERTY_TYPE_ID },
    create: { id: PROPERTY_TYPE_ID, name: "Favorite Test Property Type", slug: "favorite-test-property-type" },
    update: {},
  });

  const [a, b] = await Promise.all([
    prisma.listing.create({
      data: {
        hostId: USER_ID,
        propertyTypeId: PROPERTY_TYPE_ID,
        title: "Favorite Test Listing A",
        slug: `favorite-test-listing-a-${crypto.randomUUID()}`,
        description: "Listing A",
        rentalType: "SHORT_TERM",
        bedrooms: 1,
        bathrooms: 1,
        maxOccupants: 2,
        currency: "USD",
        status: "PUBLISHED",
        nightlyPrice: 80,
        minNights: 1,
        checkInTime: "15:00",
        checkOutTime: "11:00",
        instantBook: true,
        cancellationPolicy: "FLEXIBLE",
      },
    }),
    prisma.listing.create({
      data: {
        hostId: USER_ID,
        propertyTypeId: PROPERTY_TYPE_ID,
        title: "Favorite Test Listing B",
        slug: `favorite-test-listing-b-${crypto.randomUUID()}`,
        description: "Listing B",
        rentalType: "SHORT_TERM",
        bedrooms: 2,
        bathrooms: 1,
        maxOccupants: 4,
        currency: "USD",
        status: "PUBLISHED",
        nightlyPrice: 120,
        minNights: 1,
        checkInTime: "15:00",
        checkOutTime: "11:00",
        instantBook: true,
        cancellationPolicy: "FLEXIBLE",
      },
    }),
  ]);
  listingAId = a.id;
  listingBId = b.id;
});

afterAll(async () => {
  await prisma.favorite.deleteMany({ where: { userId: USER_ID } });
  await prisma.listing.deleteMany({ where: { id: { in: [listingAId, listingBId].filter(Boolean) } } });
  await prisma.propertyType.deleteMany({ where: { id: PROPERTY_TYPE_ID } });
  await prisma.user.deleteMany({ where: { id: USER_ID } });
  await prisma.$disconnect();
});

describe("toggleFavorite", () => {
  it("creates a favorite on first toggle and removes it on second toggle", async () => {
    const first = await toggleFavorite(listingAId);
    expect(first.success).toBe(true);
    if (first.success) expect(first.data.favorited).toBe(true);

    expect(await isFavorited(USER_ID, listingAId)).toBe(true);

    const second = await toggleFavorite(listingAId);
    expect(second.success).toBe(true);
    if (second.success) expect(second.data.favorited).toBe(false);

    expect(await isFavorited(USER_ID, listingAId)).toBe(false);
  });

  it("returns NOT_FOUND for a nonexistent listing", async () => {
    const result = await toggleFavorite("00000000-0000-0000-0000-000000000000");
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe("NOT_FOUND");
  });
});

describe("getMyFavoriteListings / getFavoritedListingIds", () => {
  it("returns favorited listings most-recently-favorited-first and bulk-checks correctly", async () => {
    await toggleFavorite(listingAId);
    await toggleFavorite(listingBId);

    const favorites = await getMyFavoriteListings(USER_ID);
    expect(favorites.map((l) => l.id)).toEqual([listingBId, listingAId]);

    const idSet = await getFavoritedListingIds(USER_ID, [listingAId, listingBId, "00000000-0000-0000-0000-000000000000"]);
    expect(idSet.has(listingAId)).toBe(true);
    expect(idSet.has(listingBId)).toBe(true);
    expect(idSet.size).toBe(2);
  });
});
