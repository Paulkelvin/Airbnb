import { prisma } from "@/lib/db";
import { getPrimaryListing } from "@/modules/listings/queries";
import { parseIcalBlockedRanges, expandRangesToDates } from "@/lib/ical-parse";

export interface ExternalCalendarSyncSummary {
  synced: boolean;
  reason?: string;
  datesBlocked?: number;
}

/**
 * Pulls the cottage's Airbnb export calendar (AIRBNB_ICAL_URL) and mirrors
 * its blocked dates into our own Availability table as BLOCKED rows, so a
 * booking made on Airbnb also blocks that date here — closing the other
 * direction of the sync from calendar.ics (which pushes our bookings out to
 * Airbnb). Without this, a guest could book the same date on both
 * platforms.
 *
 * Nothing else in this codebase writes AvailabilityStatus.BLOCKED (only
 * BOOKED, tied to our own bookings, ever gets created elsewhere) — so this
 * job owns that status exclusively and can safely replace the full set on
 * every run: delete all current bookingId-null BLOCKED rows for the
 * listing, then recreate from the freshly fetched feed. That makes a
 * cancellation on Airbnb's side self-healing (it just stops appearing in
 * the next fetch) without needing a separate "source" field to track which
 * blocks came from this import versus a hypothetical future manual-block
 * feature.
 *
 * `skipDuplicates` on the insert means a date Airbnb reports as blocked but
 * that's already BOOKED here (a real guest booking) is left alone rather
 * than overwritten — the unique([listingId, date]) constraint makes that
 * date already taken, so the insert for it is simply skipped.
 */
export async function runExternalCalendarSyncJob(): Promise<ExternalCalendarSyncSummary> {
  const icalUrl = process.env.AIRBNB_ICAL_URL;
  if (!icalUrl) {
    return { synced: false, reason: "AIRBNB_ICAL_URL not configured" };
  }

  const listing = await getPrimaryListing();
  if (!listing) {
    return { synced: false, reason: "No primary listing" };
  }

  const response = await fetch(icalUrl, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to fetch Airbnb calendar: ${response.status} ${response.statusText}`);
  }
  const icalText = await response.text();

  const ranges = parseIcalBlockedRanges(icalText);
  const dates = expandRangesToDates(ranges);

  await prisma.$transaction(async (tx) => {
    await tx.availability.deleteMany({
      where: { listingId: listing.id, status: "BLOCKED", bookingId: null },
    });
    if (dates.length > 0) {
      await tx.availability.createMany({
        data: dates.map((date) => ({ listingId: listing.id, date, status: "BLOCKED" as const })),
        skipDuplicates: true,
      });
    }
  });

  return { synced: true, datesBlocked: dates.length };
}
