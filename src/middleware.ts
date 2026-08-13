import { NextResponse, type NextRequest } from "next/server";

// Free alternative to Vercel's paid Deployment Protection: flip
// MAINTENANCE_MODE=true in the project's Environment Variables (Vercel
// dashboard -> Settings -> Environment Variables) and redeploy to take the
// site offline for every visitor; set it back to false (or remove it) and
// redeploy to bring it back exactly as it was. Webhook routes stay open
// during maintenance so in-flight Stripe events don't get dropped.
const MAINTENANCE_BYPASS_PREFIXES = ["/api/webhooks"];

const MAINTENANCE_PAGE = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>We'll be right back - Potomac Vista Cottage</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #faf9f7; color: #1a1a18; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 2rem; text-align: center; }
  .card { max-width: 28rem; }
  h1 { font-size: 1.5rem; margin-bottom: 0.75rem; }
  p { color: #6b6960; line-height: 1.6; }
</style>
</head>
<body>
  <div class="card">
    <h1>We'll be right back</h1>
    <p>Potomac Vista Cottage's booking site is briefly offline for maintenance. Please check back shortly.</p>
  </div>
</body>
</html>`;

export function middleware(request: NextRequest) {
  if (process.env.MAINTENANCE_MODE !== "true") {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;
  if (MAINTENANCE_BYPASS_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  return new NextResponse(MAINTENANCE_PAGE, {
    status: 503,
    headers: { "content-type": "text/html", "retry-after": "3600" },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
