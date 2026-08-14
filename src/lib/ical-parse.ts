/** One VEVENT's blocked date range: [start, end) — end is exclusive, same
 * convention as our own checkInDate/checkOutDate (see pricing.ts). */
export interface IcalDateRange {
  start: Date;
  end: Date;
}

function parseIcalDate(value: string): Date {
  // All-day VALUE=DATE form: YYYYMMDD. DATE-TIME form (YYYYMMDDTHHMMSSZ or
  // floating/local) is normalized down to just its date part — this feed is
  // only ever used for whole-night availability blocking, never precise
  // times.
  const digits = value.replace(/[^0-9]/g, "").slice(0, 8);
  const year = Number(digits.slice(0, 4));
  const month = Number(digits.slice(4, 6));
  const day = Number(digits.slice(6, 8));
  return new Date(Date.UTC(year, month - 1, day));
}

/**
 * Minimal RFC 5545 parser: pulls DTSTART/DTEND out of each VEVENT. Ignores
 * everything else (SUMMARY, UID, RRULE, etc.) — Airbnb's export doesn't use
 * recurrence for date blocks, and this is only ever fed that one format, not
 * arbitrary third-party calendars.
 */
export function parseIcalBlockedRanges(icalText: string): IcalDateRange[] {
  // RFC 5545 line-unfolding: a CRLF followed by a space or tab continues
  // the previous line.
  const unfolded = icalText.replace(/\r\n[ \t]/g, "").replace(/\n[ \t]/g, "");
  const lines = unfolded.split(/\r\n|\n/);

  const ranges: IcalDateRange[] = [];
  let inEvent = false;
  let start: Date | null = null;
  let end: Date | null = null;

  for (const line of lines) {
    if (line.startsWith("BEGIN:VEVENT")) {
      inEvent = true;
      start = null;
      end = null;
      continue;
    }
    if (line.startsWith("END:VEVENT")) {
      if (inEvent && start && end && end.getTime() > start.getTime()) {
        ranges.push({ start, end });
      }
      inEvent = false;
      continue;
    }
    if (!inEvent) continue;

    const colonIndex = line.indexOf(":");
    if (colonIndex === -1) continue;
    const key = line.slice(0, colonIndex);
    const value = line.slice(colonIndex + 1).trim();

    if (key === "DTSTART" || key.startsWith("DTSTART;")) {
      start = parseIcalDate(value);
    } else if (key === "DTEND" || key.startsWith("DTEND;")) {
      end = parseIcalDate(value);
    }
  }

  return ranges;
}

/** Expands ranges into individual UTC midnight Dates, one per blocked night. */
export function expandRangesToDates(ranges: IcalDateRange[]): Date[] {
  const dates: Date[] = [];
  for (const { start, end } of ranges) {
    const cursor = new Date(start);
    while (cursor.getTime() < end.getTime()) {
      dates.push(new Date(cursor));
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
  }
  return dates;
}
