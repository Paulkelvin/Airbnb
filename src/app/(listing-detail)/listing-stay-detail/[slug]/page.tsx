import { notFound } from "next/navigation";
import { getListingBySlug } from "@/modules/listings/queries";
import { getBlockedDatesForListing } from "@/modules/bookings/queries";
import { getReviewsForListing } from "@/modules/reviews/queries";
import { isFavorited } from "@/modules/favorites/queries";
import { getCurrentUser } from "@/lib/auth";
import { getServiceFeePercent } from "@/modules/admin/settings";
import { toDetailViewModel } from "@/modules/listings/types";
import { getFeaturedAttractions } from "@/lib/attractions";
import ListingDetailView from "./ListingDetailView";
import type { ListingReview } from "./ReviewsSection";

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const listing = await getListingBySlug(params.slug);
  return { title: listing ? listing.title : "Listing not found" };
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
  const [blockedDates, reviewRows, favorited, serviceFeePercentWhole, attractions] = await Promise.all([
    listing.rentalType === "SHORT_TERM" ? getBlockedDatesForListing(listing.id) : Promise.resolve([]),
    getReviewsForListing(listing.id),
    user ? isFavorited(user.id, listing.id) : Promise.resolve(false),
    getServiceFeePercent(),
    getFeaturedAttractions(),
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
    <ListingDetailView
      listing={viewModel}
      isOwner={isOwner}
      isAdmin={isAdmin}
      isAuthenticated={Boolean(user)}
      blockedDates={blockedDates}
      reviews={reviews}
      isFavorited={favorited}
      serviceFeePercent={serviceFeePercent}
      attractions={attractions}
    />
  );
}
