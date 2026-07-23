import type {
  Listing,
  Address,
  Image as ListingImageRow,
  ListingAmenity,
  Amenity,
  PropertyType,
  User,
} from "@prisma/client";
import type { Route } from "@/routers/types";
import type { StayDataType } from "@/data/types";
import { parseListingMetadata } from "./metadata";

export type ListingWithRelations = Listing & {
  address: Address | null;
  images: ListingImageRow[];
  amenities: (ListingAmenity & { amenity: Amenity })[];
  propertyType: PropertyType;
  host: Pick<User, "id" | "firstName" | "lastName" | "avatarUrl">;
};

export interface ListingDetailViewModel {
  id: string;
  slug: string;
  title: string;
  description: string;
  status: Listing["status"];
  rentalType: Listing["rentalType"];
  bedrooms: number;
  bathrooms: number;
  maxOccupants: number;
  sizeSqft: number | null;
  currency: string;
  avgRating: number;
  reviewCount: number;
  propertyType: { id: string; name: string; slug: string };
  address: {
    line1: string;
    line2: string | null;
    city: string;
    region: string;
    postalCode: string;
    country: string;
    latitude: number | null;
    longitude: number | null;
    formattedAddress: string | null;
  } | null;
  images: { id: number; url: string; category: string | null }[];
  amenities: { id: string; name: string; category: string | null; icon: string | null }[];
  host: { id: string; name: string; avatarUrl: string | null };
  pricing:
    | {
        rentalType: "SHORT_TERM";
        nightlyPrice: number;
        cleaningFee: number | null;
        minNights: number;
        maxNights: number | null;
        weeklyDiscountPercent: number | null;
        monthlyDiscountPercent: number | null;
        checkInTime: string | null;
        checkInWindowEnd: string | null;
        checkOutTime: string | null;
        instantBook: boolean;
        cancellationPolicy: string;
        petPolicy: string;
      }
    | {
        rentalType: "LONG_TERM";
        monthlyRent: number;
        securityDeposit: number | null;
        minLeaseTermMonths: number;
        maxLeaseTermMonths: number | null;
        availableFromDate: string | null;
        utilitiesIncluded: boolean;
        petPolicy: string;
        earlyTerminationPolicy: string;
      };
  ownerId: string;
}

function toNumber(value: unknown): number {
  return value === null || value === undefined ? 0 : Number(value);
}

export function toDetailViewModel(
  listing: ListingWithRelations,
): ListingDetailViewModel {
  const metadata = parseListingMetadata(listing.metadata);
  const pricing: ListingDetailViewModel["pricing"] =
    listing.rentalType === "SHORT_TERM"
      ? {
          rentalType: "SHORT_TERM",
          nightlyPrice: toNumber(listing.nightlyPrice),
          cleaningFee: listing.cleaningFee ? toNumber(listing.cleaningFee) : null,
          minNights: listing.minNights ?? 1,
          maxNights: listing.maxNights,
          weeklyDiscountPercent: listing.weeklyDiscountPercent
            ? toNumber(listing.weeklyDiscountPercent)
            : null,
          monthlyDiscountPercent: listing.monthlyDiscountPercent
            ? toNumber(listing.monthlyDiscountPercent)
            : null,
          checkInTime: listing.checkInTime,
          checkInWindowEnd: metadata.checkInWindowEnd ?? null,
          checkOutTime: listing.checkOutTime,
          instantBook: listing.instantBook ?? false,
          cancellationPolicy: listing.cancellationPolicy ?? "MODERATE",
          petPolicy: listing.petPolicy ?? "NOT_ALLOWED",
        }
      : {
          rentalType: "LONG_TERM",
          monthlyRent: toNumber(listing.monthlyRent),
          securityDeposit: listing.securityDeposit
            ? toNumber(listing.securityDeposit)
            : null,
          minLeaseTermMonths: listing.minLeaseTermMonths ?? 1,
          maxLeaseTermMonths: listing.maxLeaseTermMonths,
          availableFromDate: listing.availableFromDate
            ? listing.availableFromDate.toISOString()
            : null,
          utilitiesIncluded: listing.utilitiesIncluded ?? false,
          petPolicy: listing.petPolicy ?? "NOT_ALLOWED",
          earlyTerminationPolicy: listing.earlyTerminationPolicy ?? "STANDARD",
        };

  return {
    id: listing.id,
    slug: listing.slug,
    title: listing.title,
    description: listing.description,
    status: listing.status,
    rentalType: listing.rentalType,
    bedrooms: listing.bedrooms,
    bathrooms: toNumber(listing.bathrooms),
    maxOccupants: listing.maxOccupants,
    sizeSqft: listing.sizeSqft,
    currency: listing.currency,
    avgRating: listing.avgRating ? toNumber(listing.avgRating) : 0,
    reviewCount: listing.reviewCount,
    propertyType: {
      id: listing.propertyType.id,
      name: listing.propertyType.name,
      slug: listing.propertyType.slug,
    },
    address: listing.address
      ? {
          line1: listing.address.line1,
          line2: listing.address.line2,
          city: listing.address.city,
          region: listing.address.region,
          postalCode: listing.address.postalCode,
          country: listing.address.country,
          latitude: listing.address.latitude,
          longitude: listing.address.longitude,
          formattedAddress: listing.address.formattedAddress,
        }
      : null,
    images: listing.images
      .sort((a, b) => a.position - b.position)
      .map((img, i) => ({ id: i, url: img.url, category: img.category })),
    amenities: listing.amenities.map((la) => ({
      id: la.amenity.id,
      name: la.amenity.name,
      category: la.amenity.category,
      icon: la.amenity.icon,
    })),
    host: {
      id: listing.host.id,
      name: `${listing.host.firstName} ${listing.host.lastName}`,
      avatarUrl: listing.host.avatarUrl,
    },
    pricing,
    ownerId: listing.hostId,
  };
}

export function toCardViewModel(listing: ListingWithRelations): StayDataType {
  const cover =
    listing.images.find((img) => img.isCover) ??
    [...listing.images].sort((a, b) => a.position - b.position)[0];

  const price =
    listing.rentalType === "SHORT_TERM"
      ? `$${toNumber(listing.nightlyPrice)}`
      : `$${toNumber(listing.monthlyRent)}`;

  return {
    id: listing.id,
    author: {
      id: listing.host.id,
      firstName: listing.host.firstName,
      lastName: listing.host.lastName,
      displayName: `${listing.host.firstName} ${listing.host.lastName}`,
      avatar: listing.host.avatarUrl ?? "",
      count: 0,
      desc: "",
      jobName: "Host",
      href: "/" as Route,
    },
    date: (listing.publishedAt ?? listing.createdAt).toISOString(),
    href: `/listing-stay-detail/${listing.slug}` as Route,
    title: listing.title,
    featuredImage: cover?.url ?? "",
    commentCount: 0,
    viewCount: listing.viewCount,
    address: listing.address
      ? `${listing.address.city}, ${listing.address.country}`
      : "",
    reviewStart: listing.avgRating ? toNumber(listing.avgRating) : 0,
    reviewCount: listing.reviewCount,
    like: false,
    galleryImgs: listing.images
      .sort((a, b) => a.position - b.position)
      .map((img) => img.url),
    price,
    listingCategory: {
      id: listing.propertyType.id,
      name: listing.propertyType.name,
      href: "/listing-stay" as Route,
      taxonomy: "category",
    },
    maxGuests: listing.maxOccupants,
    bedrooms: listing.bedrooms,
    bathrooms: toNumber(listing.bathrooms),
    saleOff: null,
    isAds: false,
    map: {
      lat: listing.address?.latitude ?? 0,
      lng: listing.address?.longitude ?? 0,
    },
  };
}
