import { notFound } from "next/navigation";
import { getListingBySlug } from "@/modules/listings/queries";
import { getCurrentUser } from "@/lib/auth";
import { toDetailViewModel } from "@/modules/listings/types";
import ListingDetailView from "./ListingDetailView";

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

  return <ListingDetailView listing={viewModel} isOwner={isOwner} />;
}
