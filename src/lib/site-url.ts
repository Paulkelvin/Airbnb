/**
 * Canonical origin for the deployed app, used anywhere an absolute URL is
 * needed (password-reset email links, sitemap/robots, metadataBase).
 * Reuses `NEXTAUTH_URL` since it's already required to exactly match the
 * app's own origin (see docs/setup/environment-variables.md) rather than
 * introducing a second "what's my domain" variable. Falls back to Vercel's
 * own preview URL, then localhost, so nothing throws in an environment
 * where `NEXTAUTH_URL` isn't set yet.
 */
export function getSiteUrl(): string {
  if (process.env.NEXTAUTH_URL) return process.env.NEXTAUTH_URL.trim();
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}
