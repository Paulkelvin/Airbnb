import { NextRequest, NextResponse } from "next/server";
import { runReviewExpiryJob } from "@/jobs/review-expiry";

/**
 * Triggered daily by the `crons` entry in vercel.json to auto-publish
 * reviews whose 14-day double-blind window has closed — see ADR-015.
 * Vercel Cron sends GET and auto-attaches `Authorization: Bearer
 * $CRON_SECRET`; POST is also exposed for manual/local triggering.
 */
async function handle(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const summary = await runReviewExpiryJob();
  return NextResponse.json({ success: true, summary });
}

export { handle as GET, handle as POST };
