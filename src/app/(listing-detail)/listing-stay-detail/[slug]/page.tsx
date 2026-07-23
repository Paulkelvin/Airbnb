import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getListingBySlug } from "@/modules/listings/queries";
import { getBlockedDatesForListing } from "@/modules/bookings/queries";
import { getReviewsForListing } from "@/modules/reviews/queries";
import { getCurrentUser } from "@/lib/auth";
import { getServiceFeePercent } from "@/modules/admin/settings";
import { toDetailViewModel, type ListingDetailViewModel } from "@/modules/listings/types";
import { getFeaturedExperiences } from "@/lib/local-experiences";
import { getSiteUrl } from "@/lib/site-url";
import ListingDetailView from "./ListingDetailView";
import type { ListingReview } from "./ReviewsSection";

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const listing = await getListingBySlug(params.slug);
  if (!listing) return { title: "Listing not found" };

  const vm = toDetailViewModel(listing);
  const siteUrl = getSiteUrl();
  const url = `${siteUrl}/listing-stay-detail/${params.slug}`;
  const image = vm.images[0]?.url;
  const location = vm.address ? `${vm.address.city}, ${vm.address.region}` : "";

  const priceLabel =
    vm.pricing.rentalType === "SHORT_TERM"
      ? `$${vm.pricing.nightlyPrice}/night`
      : `$${vm.pricing.monthlyRent}/month`;

  const description = [
    vm.title,
    location && `in ${location}`,
    `— ${vm.bedrooms} bed${vm.bedrooms !== 1 ? "s" : ""}, ${vm.bathrooms} bath${vm.bathrooms !== 1 ? "s" : ""}`,
    `· From ${priceLabel}`,
    vm.reviewCount > 0
      ? `· ${vm.avgRating.toFixed(1)} stars (${vm.reviewCount} review${vm.reviewCount !== 1 ? "s" : ""})`
      : null,
  ]
    .filter(Boolean)
    .join(" ");

  return {
    title: vm.title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: vm.title,
      description,
      url,
      type: "website",
      ...(image && { images: [{ url: image, width: 1200, height: 630, alt: vm.title }] }),
    },
    twitter: {
      card: "summary_large_image",
      title: vm.title,
      description,
      ...(image && { images: [image] }),
    },
  };
}

function ListingJsonLd({ listing, slug }: { listing: ListingDetailViewModel; slug: string }) {
  const siteUrl = getSiteUrl();
  const url = `${siteUrl}/listing-stay-detail/${slug}`;
  const image = listing.images[0]?.url;

  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "LodgingBusiness",
    name: listing.title,
    description: listing.description,
    url,
    ...(image && { image }),
    ...(listing.address && {
      address: {
        "@type": "PostalAddress",
        streetAddress: listing.address.line1,
        addressLocality: listing.address.city,
        addressRegion: listing.address.region,
        postalCode: listing.address.postalCode,
        addressCountry: listing.address.country,
      },
      ...(listing.address.latitude != null && listing.address.longitude != null && {
        geo: {
          "@type": "GeoCoordinates",
          latitude: listing.address.latitude,
          longitude: listing.address.longitude,
        },
      }),
    }),
    numberOfRooms: listing.bedrooms,
    amenityFeature: listing.amenities.map((a) => ({
      "@type": "LocationFeatureSpecification",
      name: a.name,
      value: true,
    })),
  };

  if (listing.reviewCount > 0) {
    jsonLd.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: listing.avgRating,
      reviewCount: listing.reviewCount,
      bestRating: 5,
      worstRating: 1,
    };
  }

  if (listing.pricing.rentalType === "SHORT_TERM") {
    jsonLd.priceRange = `From $${listing.pricing.nightlyPrice}/night`;
    jsonLd.checkinTime = listing.pricing.checkInTime ?? undefined;
    jsonLd.checkoutTime = listing.pricing.checkOutTime ?? undefined;
  } else {
    jsonLd.priceRange = `From $${listing.pricing.monthlyRent}/month`;
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

export default async function ListingStayDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const user = await getCurrentUser();
  const listing = await getListingBySlug(
    params.slug,
    user ? { id: user.id, roles: user.roles } : undefined,
  );

  if (!listing) {
    notFound();
  }

  const viewModel = toDetailViewModel(listing);
  const isOwner = user?.id === listing.hostId;
  const isAdmin = user?.roles.includes("ADMIN") ?? false;
  const [blockedDates, reviewRows, serviceFeePercentWhole, experiences] = await Promise.all([
    listing.rentalType === "SHORT_TERM" ? getBlockedDatesForListing(listing.id) : Promise.resolve([]),
    getReviewsForListing(listing.id),
    getServiceFeePercent(),
    getFeaturedExperiences(),
  ]);
  const serviceFeePercent = serviceFeePercentWhole / 100;

  const reviews = reviewRows.map((r) => ({
    id: r.id,
    rating: r.rating,
    comment: r.comment,
    hostResponse: r.hostResponse,
    publishedAt: r.publishedAt ? r.publishedAt.toISOString() : null,
    subRatings: r.subRatings as ListingReview["subRatings"],
    author: r.author,
  }));

  return (
    <>
      <ListingJsonLd listing={viewModel} slug={params.slug} />
      <ListingDetailView
        listing={viewModel}
        isOwner={isOwner}
        isAdmin={isAdmin}
        isAuthenticated={Boolean(user)}
        blockedDates={blockedDates}
        reviews={reviews}
        serviceFeePercent={serviceFeePercent}
        experiences={experiences}
      />
    </>
  );
}
