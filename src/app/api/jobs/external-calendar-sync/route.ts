import { NextRequest, NextResponse } from "next/server";
import { runExternalCalendarSyncJob } from "@/jobs/external-calendar-sync";

/**
 * Triggered hourly by the `crons` entry in vercel.json to pull Airbnb's
 * export calendar and block those dates on our own listing — see
 * src/jobs/external-calendar-sync.ts for why. Vercel Cron sends GET and
 * auto-attaches `Authorization: Bearer $CRON_SECRET`; POST is also exposed
 * for manual/local triggering.
 */
async function handle(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const summary = await runExternalCalendarSyncJob();
  return NextResponse.json({ success: true, summary });
}

export { handle as GET, handle as POST };
