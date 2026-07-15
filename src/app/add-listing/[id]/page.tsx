import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getOwnedListingById, getActivePropertyTypes, getActiveAmenities } from "@/modules/listings/queries";
import AddListingWizard from "../AddListingWizard";
import type { WizardListing } from "../AddListingWizard";

export const metadata = { title: "Edit listing" };

export default async function AddListingContinuePage({
  params,
}: {
  params: { id: string };
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const listing = await getOwnedListingById(params.id, user.id);
  if (!listing) {
    notFound();
  }

  const [propertyTypes, amenities] = await Promise.all([
    getActivePropertyTypes(),
    getActiveAmenities(),
  ]);

  const initialListing: WizardListing = {
    id: listing.id,
    slug: listing.slug,
    status: listing.status,
    rentalType: listing.rentalType,
    title: listing.title,
    description: listing.description,
    propertyTypeId: listing.propertyTypeId,
    bedrooms: listing.bedrooms,
    bathrooms: Number(listing.bathrooms),
    maxOccupants: listing.maxOccupants,
    sizeSqft: listing.sizeSqft,
    currency: listing.currency,
    amenityIds: listing.amenities.map((a) => a.amenityId),
    images: listing.images
      .sort((a, b) => a.position - b.position)
      .map((img) => ({
        url: img.url,
        publicId: img.publicId ?? "",
        position: img.position,
        isCover: img.isCover,
        width: img.width,
        height: img.height,
      })),
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
        }
      : null,
    nightlyPrice: listing.nightlyPrice ? Number(listing.nightlyPrice) : null,
    cleaningFee: listing.cleaningFee ? Number(listing.cleaningFee) : null,
    minNights: listing.minNights,
    maxNights: listing.maxNights,
    weeklyDiscountPercent: listing.weeklyDiscountPercent
      ? Number(listing.weeklyDiscountPercent)
      : null,
    monthlyDiscountPercent: listing.monthlyDiscountPercent
      ? Number(listing.monthlyDiscountPercent)
      : null,
    checkInTime: listing.checkInTime,
    checkOutTime: listing.checkOutTime,
    instantBook: listing.instantBook,
    cancellationPolicy: listing.cancellationPolicy,
    monthlyRent: listing.monthlyRent ? Number(listing.monthlyRent) : null,
    securityDeposit: listing.securityDeposit ? Number(listing.securityDeposit) : null,
    minLeaseTermMonths: listing.minLeaseTermMonths,
    maxLeaseTermMonths: listing.maxLeaseTermMonths,
    availableFromDate: listing.availableFromDate
      ? listing.availableFromDate.toISOString().slice(0, 10)
      : null,
    utilitiesIncluded: listing.utilitiesIncluded,
    petPolicy: listing.petPolicy,
    earlyTerminationPolicy: listing.earlyTerminationPolicy,
  };

  return (
    <AddListingWizard
      initialListing={initialListing}
      propertyTypes={propertyTypes}
      amenities={amenities}
    />
  );
}
