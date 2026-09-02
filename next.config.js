const isProd = process.env.NODE_ENV === "production";

/**
 * Baseline CSP (release-readiness §4). Sources are scoped to what this app
 * actually loads: Cloudinary/Pexels/Unsplash images, the Google Maps iframe
 * embed + `google-map-react`'s tile/script requests, and the Square Web
 * Payments SDK for real card collection at checkout (both
 * web.squarecdn.com and sandbox.web.squarecdn.com are allowed
 * unconditionally so switching SQUARE_ENVIRONMENT doesn't need a CSP
 * change too — see https://developer.squareup.com/docs/web-payments/content-security-policy
 * for the exact domain list this mirrors). `'unsafe-eval'` is dev-only —
 * Next's webpack HMR needs it locally; the production bundle does not.
 * `'unsafe-inline'` for script/style is a known, accepted trade-off (Next's
 * own inline bootstrap data plus Tailwind/Headless UI inline styles) — a
 * nonce-based CSP is a larger follow-up, not required to close this
 * blocker's minimum bar of "some real CSP exists".
 */
const csp = [
  `default-src 'self'`,
  `script-src 'self' 'unsafe-inline' ${isProd ? "" : "'unsafe-eval'"} https://maps.googleapis.com https://web.squarecdn.com https://sandbox.web.squarecdn.com`,
  `style-src 'self' 'unsafe-inline' https://web.squarecdn.com https://sandbox.web.squarecdn.com`,
  `img-src 'self' data: blob: https://images.pexels.com https://images.unsplash.com https://res.cloudinary.com https://cdn.sanity.io https://*.googleapis.com https://*.gstatic.com https://*.ggpht.com`,
  `font-src 'self' data: https://square-fonts-production-f.squarecdn.com https://d1g145x70srn7h.cloudfront.net`,
  `connect-src 'self' https://maps.googleapis.com https://web.squarecdn.com https://sandbox.web.squarecdn.com https://pci-connect.squareup.com https://pci-connect.squareupsandbox.com https://api.cloudinary.com https://*.sanity.io https://*.apicdn.sanity.io`,
  `frame-src 'self' https://www.google.com https://web.squarecdn.com https://sandbox.web.squarecdn.com`,
  `object-src 'none'`,
  `base-uri 'self'`,
  `frame-ancestors 'none'`,
]
  .join("; ")
  .replace(/\s+/g, " ")
  .trim();

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

/**
 * Every route gated by requireAuth()/requireAdmin() (account pages, admin,
 * add-listing) re-checks the session server-side on each real request — but
 * without an explicit no-store, Next's default Cache-Control for these
 * (`public, max-age=0, must-revalidate`) doesn't stop the browser's
 * back-forward cache from restoring a fully-rendered "logged in" snapshot
 * after logout, since bfcache eligibility is governed by no-store, not
 * max-age. That server-side check then never re-runs on a back-navigation.
 * "public" is also wrong on its own for session-derived content — nothing
 * user-specific should be cacheable by a shared/CDN cache.
 */
const noStoreHeader = [{ key: "Cache-Control", value: "private, no-store, must-revalidate" }];
const authGatedRoutes = [
  "/account",
  "/account-listings",
  "/account-billing",
  "/account-savelists",
  "/account-messages",
  "/account-messages/:path*",
  "/account-notifications",
  "/account-password",
  "/account-bookings",
  "/account-bookings/:path*",
  "/admin/:path*",
  "/add-listing",
  "/add-listing/:path*",
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    typedRoutes: true,
    // Next 13.5.11 only accepts a boolean here — the object form (to raise
    // bodySizeLimit) that a couple of Sanity-image-upload actions relied on
    // isn't supported by this version and was silently rejected (logged as
    // an "Invalid next.config.js options" warning, not a hard error).
    // uploadCmsImage compresses images client-side before upload instead,
    // to stay under the actual 1MB default rather than trying to raise it.
    serverActions: true,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
      ...authGatedRoutes.map((source) => ({ source, headers: noStoreHeader })),
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.pexels.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "cdn.sanity.io",
        port: "",
        pathname: "/**",
      },
    ],
  },
};

module.exports = nextConfig;
