const isProd = process.env.NODE_ENV === "production";

/**
 * Baseline CSP (release-readiness §4). Sources are scoped to what this app
 * actually loads: Cloudinary/Pexels/Unsplash images, the Google Maps iframe
 * embed + `google-map-react`'s tile/script requests, and Stripe.js/Checkout
 * for when real Stripe Elements replaces the current test-card stand-in
 * (see project-status.md's Known Issues). `'unsafe-eval'` is dev-only —
 * Next's webpack HMR needs it locally; the production bundle does not.
 * `'unsafe-inline'` for script/style is a known, accepted trade-off (Next's
 * own inline bootstrap data plus Tailwind/Headless UI inline styles) — a
 * nonce-based CSP is a larger follow-up, not required to close this
 * blocker's minimum bar of "some real CSP exists".
 */
const csp = [
  `default-src 'self'`,
  `script-src 'self' 'unsafe-inline' ${isProd ? "" : "'unsafe-eval'"} https://maps.googleapis.com https://js.stripe.com`,
  `style-src 'self' 'unsafe-inline'`,
  `img-src 'self' data: blob: https://images.pexels.com https://images.unsplash.com https://res.cloudinary.com https://cdn.sanity.io https://*.googleapis.com https://*.gstatic.com https://*.ggpht.com`,
  `font-src 'self' data:`,
  `connect-src 'self' https://maps.googleapis.com https://api.stripe.com https://api.cloudinary.com https://*.sanity.io https://*.apicdn.sanity.io`,
  `frame-src 'self' https://www.google.com https://js.stripe.com https://hooks.stripe.com`,
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

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    typedRoutes: true,
    serverActions: true,
  },
  async headers() {
    return [
      {
        // Sanity Studio (an embedded, independently-versioned React app
        // behind its own login) needs its own network/script permissions
        // that don't fit this app's baseline CSP — excluded here rather
        // than trying to keep the policy in sync with Studio's internals.
        source: "/((?!studio).*)",
        headers: securityHeaders,
      },
    ];
  },
  compiler: {
    styledComponents: true,
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
