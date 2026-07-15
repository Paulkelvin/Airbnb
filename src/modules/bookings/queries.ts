import { prisma } from "@/lib/db";

/** Minimal listing projection booking creation needs — not the full search/detail `listingInclude`. */
export async function getListingForBooking(listingId: string) {
  return prisma.listing.findUnique({
    where: { id: listingId },
    select: {
      id: true,
      hostId: true,
      slug: true,
      title: true,
      status: true,
      rentalType: true,
      currency: true,
      maxOccupants: true,
      nightlyPrice: true,
      cleaningFee: true,
      minNights: true,
      maxNights: true,
      weeklyDiscountPercent: true,
      monthlyDiscountPercent: true,
      instantBook: true,
      cancellationPolicy: true,
      monthlyRent: true,
      securityDeposit: true,
      minLeaseTermMonths: true,
      maxLeaseTermMonths: true,
      availableFromDate: true,
      earlyTerminationPolicy: true,
    },
  });
}

/** True if every date in [checkInDate, checkOutDate) is free of a BOOKED/BLOCKED Availability row. */
export async function isRangeAvailable(
  listingId: string,
  checkInDate: Date,
  checkOutDate: Date,
): Promise<boolean> {
  const conflict = await prisma.availability.findFirst({
    where: {
      listingId,
      status: { in: ["BOOKED", "BLOCKED"] },
      date: { gte: checkInDate, lt: checkOutDate },
    },
    select: { id: true },
  });
  return !conflict;
}

/** ISO date strings for every BOOKED/BLOCKED night in the coming window — for the booking calendar's excluded dates. */
export async function getBlockedDatesForListing(
  listingId: string,
  monthsAhead = 18,
): Promise<string[]> {
  const today = new Date(new Date().toDateString());
  const horizon = new Date(today);
  horizon.setUTCMonth(horizon.getUTCMonth() + monthsAhead);

  const rows = await prisma.availability.findMany({
    where: {
      listingId,
      status: { in: ["BOOKED", "BLOCKED"] },
      date: { gte: today, lt: horizon },
    },
    select: { date: true },
    orderBy: { date: "asc" },
  });

  return rows.map((r) => r.date.toISOString());
}

/** True if the listing currently has a CONFIRMED or ACTIVE lease (mirrors the DB partial unique index). */
export async function hasActiveLease(listingId: string): Promise<boolean> {
  const active = await prisma.booking.findFirst({
    where: { listingId, rentalType: "LONG_TERM", status: { in: ["CONFIRMED", "ACTIVE"] } },
    select: { id: true },
  });
  return Boolean(active);
}

export const bookingInclude = {
  listing: {
    select: {
      id: true,
      slug: true,
      title: true,
      currency: true,
      rentalType: true,
      images: { where: { isCover: true }, take: 1, select: { url: true } },
    },
  },
  guest: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, email: true } },
  host: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, email: true } },
  payments: { orderBy: { createdAt: "asc" as const } },
} as const;

export async function getBookingById(id: string) {
  return prisma.booking.findUnique({ where: { id }, include: bookingInclude });
}

export async function getMyBookingsAsGuest(guestId: string) {
  return prisma.booking.findMany({
    where: { guestId },
    include: bookingInclude,
    orderBy: { createdAt: "desc" },
  });
}

export async function getMyBookingsAsHost(hostId: string) {
  return prisma.booking.findMany({
    where: { hostId },
    include: bookingInclude,
    orderBy: { createdAt: "desc" },
  });
}

/** Looked up by webhook handlers to resolve a provider event back to our Payment row. */
export async function getPaymentByProviderTransactionRef(providerTransactionRef: string) {
  return prisma.payment.findFirst({ where: { providerTransactionRef } });
}
