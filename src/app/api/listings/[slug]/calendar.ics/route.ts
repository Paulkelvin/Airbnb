import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * Public iCal export of a listing's blocked/booked dates, for pasting into
 * Airbnb's (or any other platform's) "Import calendar" field so a booking
 * made here blocks the same dates there. No auth — external calendar
 * consumers can't authenticate, and Airbnb/Google Calendar poll this on
 * their own schedule. Deliberately doesn't include guest names, booking
 * IDs, or any other identifying detail: each event is just a plain busy
 * block, since this URL is effectively public once handed to another
 * platform.
 *
 * `force-dynamic` for the same reason src/app/api/listings/primary/route.ts
 * uses it: no cookies()/headers() usage, so Next would otherwise try to
 * prerender this at build time, when the database may not exist yet.
 */
export const dynamic = "force-dynamic";

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10).replace(/-/g, "");
}

function foldLine(line: string): string {
  // RFC 5545 requires folding lines longer than 75 octets by inserting a
  // CRLF followed by a space before the continuation — unlikely to matter
  // for these short lines, but keeps the output spec-compliant.
  if (line.length <= 75) return line;
  let result = line.slice(0, 75);
  let rest = line.slice(75);
  while (rest.length > 0) {
    result += "\r\n " + rest.slice(0, 74);
    rest = rest.slice(74);
  }
  return result;
}

export async function GET(_request: Request, { params }: { params: { slug: string } }) {
  const listing = await prisma.listing.findUnique({
    where: { slug: params.slug },
    select: { id: true, title: true },
  });

  if (!listing) {
    return new NextResponse("Not found", { status: 404 });
  }

  const blockedDates = await prisma.availability.findMany({
    where: { listingId: listing.id, status: { in: ["BOOKED", "BLOCKED"] } },
    select: { date: true },
    orderBy: { date: "asc" },
  });

  // Collapse consecutive dates into single ranges rather than emitting one
  // VEVENT per night, so a 5-night stay shows as one busy block, not five.
  const ranges: { start: Date; end: Date }[] = [];
  for (const { date } of blockedDates) {
    const last = ranges[ranges.length - 1];
    if (last) {
      const nextExpected = new Date(last.end);
      nextExpected.setUTCDate(nextExpected.getUTCDate() + 1);
      if (nextExpected.getTime() === date.getTime()) {
        last.end = date;
        continue;
      }
    }
    ranges.push({ start: date, end: date });
  }

  const now = new Date();
  const dtstamp = `${formatDate(now)}T${now.toISOString().slice(11, 19).replace(/:/g, "")}Z`;

  const events = ranges.map((range, i) => {
    // DTEND is exclusive per RFC 5545 for all-day events, so it's the day
    // after the last blocked night.
    const dtend = new Date(range.end);
    dtend.setUTCDate(dtend.getUTCDate() + 1);
    return [
      "BEGIN:VEVENT",
      `UID:${listing.id}-${formatDate(range.start)}-${i}@potomacvistacottage.com`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART;VALUE=DATE:${formatDate(range.start)}`,
      `DTEND;VALUE=DATE:${formatDate(dtend)}`,
      "SUMMARY:Not available",
      "END:VEVENT",
    ]
      .map(foldLine)
      .join("\r\n");
  });

  const calendar = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Potomac Vista Cottage//Calendar Export//EN",
    "CALSCALE:GREGORIAN",
    `X-WR-CALNAME:${listing.title} - Blocked Dates`,
    ...events,
    "END:VCALENDAR",
  ].join("\r\n");

  return new NextResponse(calendar, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `inline; filename="${params.slug}.ics"`,
      "Cache-Control": "public, max-age=1800",
    },
  });
}
