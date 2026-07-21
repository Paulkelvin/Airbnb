import { NextResponse } from "next/server";
import { getPrimaryListing } from "@/modules/listings/queries";

/**
 * Powers the header's mobile "Check availability" pill (HeroSearchForm2MobileFactory).
 * That component renders on every page via the root layout, so resolving the
 * cottage's slug has to happen as a runtime client fetch here rather than in
 * the layout itself — a layout-level DB call would force every otherwise-static
 * page (terms, privacy, faq, login, ...) to depend on the database at build
 * time too.
 *
 * `force-dynamic` for the same reason src/app/sitemap.ts uses it: this has no
 * cookies()/headers() usage, so Next would otherwise try to prerender it
 * statically at build time — and a transient database hiccup (or the
 * database not existing yet at build time) must never fail the whole build.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const listing = await getPrimaryListing();
  return NextResponse.json({ slug: listing?.slug ?? null });
}
