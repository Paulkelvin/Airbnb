import { NextResponse } from "next/server";
import { getPrimaryListing } from "@/modules/listings/queries";
import { getBlockedDatesForListing } from "@/modules/bookings/queries";

/**
 * Powers the header's mobile "Check availability" pill (HeroSearchForm2MobileFactory).
 * That component renders on every page via the root layout, so resolving the
 * cottage's slug has to happen as a runtime client fetch here rather than in
 * the layout itself — a layout-level DB call would force every otherwise-static
 * page (terms, privacy, faq, login, ...) to depend on the database at build
 * time too.
 *
 * Also returns blockedDates — this pill's own date picker previously let a
 * guest pick any date at all, with no connection to real availability, so
 * dates already booked (through this site or synced in from Airbnb) showed
 * as pickable here even though the actual booking widget would reject them.
 *
 * `force-dynamic` for the same reason src/app/sitemap.ts uses it: this has no
 * cookies()/headers() usage, so Next would otherwise try to prerender it
 * statically at build time — and a transient database hiccup (or the
 * database not existing yet at build time) must never fail the whole build.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const listing = await getPrimaryListing();
  const blockedDates = listing ? await getBlockedDatesForListing(listing.id) : [];
  return NextResponse.json({ slug: listing?.slug ?? null, blockedDates });
}
