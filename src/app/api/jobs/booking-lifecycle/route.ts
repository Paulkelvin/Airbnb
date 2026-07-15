import { NextRequest, NextResponse } from "next/server";
import { runBookingLifecycleJob } from "@/jobs/booking-lifecycle";

/**
 * Triggered daily by the `crons` entry in vercel.json to run date-driven
 * booking transitions and monthly rent charging — see ADR-015. Vercel Cron
 * sends GET and auto-attaches `Authorization: Bearer $CRON_SECRET`; POST is
 * also exposed for manual/local triggering with the same header.
 */
async function handle(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const summary = await runBookingLifecycleJob();
  return NextResponse.json({ success: true, summary });
}

export { handle as GET, handle as POST };
