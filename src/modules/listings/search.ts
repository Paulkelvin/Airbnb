import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { SearchParams, SortOption } from "@/lib/validations/search";
import { getListingsByIds } from "./queries";
import { toCardViewModel } from "./types";
import type { StayDataType } from "@/data/types";

export interface SearchResultItem extends StayDataType {
  distanceKm?: number;
}

export interface SearchResult {
  items: SearchResultItem[];
  nextCursor: string | null;
  appliedSort: SortOption;
}

interface CursorPayload {
  k: string; // sort key, stringified
  id: string;
}

function encodeCursor(payload: CursorPayload): string {
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

function decodeCursor(cursor: string): CursorPayload | null {
  try {
    const parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
    if (typeof parsed?.k === "string" && typeof parsed?.id === "string") return parsed;
    return null;
  } catch {
    return null;
  }
}

/**
 * The single query boundary all listing search goes through (ADR-013).
 * Postgres full-text search (`Listing.searchVector`, GIN) and PostGIS geo
 * radius (`Address.location`, GIST) are queried via raw parameterized SQL —
 * Prisma's query builder can't express tsvector ranking, ST_DWithin, or the
 * Unsupported()-typed columns directly. This raw query resolves matching
 * IDs in ranked/sorted/paginated order only; full relation hydration is a
 * second, ordinary Prisma call (`getListingsByIds`), keeping the raw SQL
 * surface small and auditable.
 */
export async function searchListings(params: SearchParams): Promise<SearchResult> {
  const effectiveSort = resolveSort(params);
  const conditions: Prisma.Sql[] = [
    Prisma.sql`l.status = 'PUBLISHED'`,
    Prisma.sql`l."rentalType" = ${params.rentalType}::"RentalType"`,
  ];

  if (params.q) {
    conditions.push(
      Prisma.sql`l."searchVector" @@ websearch_to_tsquery('english', ${params.q})`,
    );
  }

  if (params.propertyType) {
    conditions.push(Prisma.sql`pt.slug = ${params.propertyType}`);
  }

  if (params.city) {
    conditions.push(Prisma.sql`a.city ILIKE ${params.city + "%"}`);
  }

  const priceColumn =
    params.rentalType === "SHORT_TERM"
      ? Prisma.raw(`l."nightlyPrice"`)
      : Prisma.raw(`l."monthlyRent"`);

  if (params.minPrice !== undefined) {
    conditions.push(Prisma.sql`${priceColumn} >= ${params.minPrice}`);
  }
  if (params.maxPrice !== undefined) {
    conditions.push(Prisma.sql`${priceColumn} <= ${params.maxPrice}`);
  }
  if (params.bedrooms !== undefined) {
    conditions.push(Prisma.sql`l.bedrooms >= ${params.bedrooms}`);
  }
  if (params.bathrooms !== undefined) {
    conditions.push(Prisma.sql`l.bathrooms >= ${params.bathrooms}`);
  }
  if (params.guests !== undefined) {
    conditions.push(Prisma.sql`l."maxOccupants" >= ${params.guests}`);
  }

  if (params.amenities && params.amenities.length > 0) {
    const amenityIds = await resolveAmenityIds(params.amenities);
    if (amenityIds.length > 0) {
      // Relational division: every requested amenity must be present.
      conditions.push(Prisma.sql`
        NOT EXISTS (
          SELECT 1 FROM unnest(${amenityIds}::uuid[]) AS req(id)
          WHERE NOT EXISTS (
            SELECT 1 FROM "ListingAmenity" la
            WHERE la."listingId" = l.id AND la."amenityId" = req.id
          )
        )
      `);
    } else {
      // Requested slugs matched nothing real — force an empty result rather
      // than silently ignoring the filter.
      conditions.push(Prisma.sql`FALSE`);
    }
  }

  if (params.rentalType === "SHORT_TERM" && params.checkIn && params.checkOut) {
    conditions.push(Prisma.sql`
      NOT EXISTS (
        SELECT 1 FROM "Availability" av
        WHERE av."listingId" = l.id
          AND av.status IN ('BOOKED', 'BLOCKED')
          AND av.date >= ${params.checkIn}::date
          AND av.date < ${params.checkOut}::date
      )
    `);
  }

  if (params.rentalType === "LONG_TERM" && params.moveIn) {
    conditions.push(
      Prisma.sql`(l."availableFromDate" IS NULL OR l."availableFromDate" <= ${params.moveIn}::date)`,
    );
  }

  const hasGeo = params.lat !== undefined && params.lng !== undefined;
  if (hasGeo && params.radiusKm) {
    conditions.push(Prisma.sql`
      ST_DWithin(
        a.location,
        ST_SetSRID(ST_MakePoint(${params.lng}, ${params.lat}), 4326)::geography,
        ${params.radiusKm * 1000}
      )
    `);
  }

  const sortKeyExpr = buildSortKeyExpr(effectiveSort, params);
  const direction = sortDirection(effectiveSort);

  const cursor = params.cursor ? decodeCursor(params.cursor) : null;
  if (cursor) {
    const op = direction === "DESC" ? Prisma.raw("<") : Prisma.raw(">");
    conditions.push(Prisma.sql`
      (${sortKeyExpr}, l.id) ${op} (${castCursorValue(effectiveSort, cursor.k)}, ${cursor.id}::uuid)
    `);
  }

  const whereClause = Prisma.join(conditions, " AND ");
  const orderDirection = direction === "DESC" ? Prisma.raw("DESC") : Prisma.raw("ASC");

  const rows = await prisma.$queryRaw<{ id: string; sort_key: string }[]>`
    SELECT l.id AS id, (${sortKeyExpr})::text AS sort_key
    FROM "Listing" l
    JOIN "Address" a ON a."listingId" = l.id
    JOIN "PropertyType" pt ON pt.id = l."propertyTypeId"
    WHERE ${whereClause}
    ORDER BY (${sortKeyExpr}) ${orderDirection}, l.id ${orderDirection}
    LIMIT ${params.limit + 1}
  `;

  const hasMore = rows.length > params.limit;
  const page = hasMore ? rows.slice(0, params.limit) : rows;

  const hydrated = await getListingsByIds(page.map((r) => r.id));
  const byId = new Map(hydrated.map((listing) => [listing.id, listing]));

  const items: SearchResultItem[] = page
    .map((row) => {
      const listing = byId.get(row.id);
      if (!listing) return null;
      const card = toCardViewModel(listing);
      if (effectiveSort === "distance") {
        return { ...card, distanceKm: Number(row.sort_key) / 1000 };
      }
      return card;
    })
    .filter((item): item is SearchResultItem => item !== null);

  const last = page[page.length - 1];
  const nextCursor = hasMore && last ? encodeCursor({ k: last.sort_key, id: last.id }) : null;

  return { items, nextCursor, appliedSort: effectiveSort };
}

async function resolveAmenityIds(slugs: string[]): Promise<string[]> {
  const amenities = await prisma.amenity.findMany({
    where: { slug: { in: slugs } },
    select: { id: true },
  });
  return amenities.map((a) => a.id);
}

function resolveSort(params: SearchParams): SortOption {
  if (params.sort) {
    if (params.sort === "relevance" && !params.q) return "newest";
    if (params.sort === "distance" && (params.lat === undefined || params.lng === undefined)) {
      return "newest";
    }
    return params.sort;
  }
  if (params.q) return "relevance";
  if (params.lat !== undefined && params.lng !== undefined) return "distance";
  return "newest";
}

function sortDirection(sort: SortOption): "ASC" | "DESC" {
  return sort === "price_asc" || sort === "distance" ? "ASC" : "DESC";
}

function buildSortKeyExpr(sort: SortOption, params: SearchParams): Prisma.Sql {
  switch (sort) {
    case "relevance":
      return Prisma.sql`ts_rank(l."searchVector", websearch_to_tsquery('english', ${params.q ?? ""}))`;
    case "price_asc":
    case "price_desc":
      return params.rentalType === "SHORT_TERM"
        ? Prisma.sql`l."nightlyPrice"`
        : Prisma.sql`l."monthlyRent"`;
    case "rating":
      return Prisma.sql`COALESCE(l."avgRating", 0)`;
    case "distance":
      return Prisma.sql`ST_Distance(a.location, ST_SetSRID(ST_MakePoint(${params.lng ?? 0}, ${params.lat ?? 0}), 4326)::geography)`;
    case "newest":
    default:
      return Prisma.sql`COALESCE(l."publishedAt", l."createdAt")`;
  }
}

/** Casts the string-encoded cursor value back to the type the sort key expression compares against. */
function castCursorValue(sort: SortOption, value: string): Prisma.Sql {
  switch (sort) {
    case "newest":
      return Prisma.sql`${value}::timestamp`;
    case "relevance":
    case "price_asc":
    case "price_desc":
    case "rating":
    case "distance":
    default:
      return Prisma.sql`${value}::float8`;
  }
}
