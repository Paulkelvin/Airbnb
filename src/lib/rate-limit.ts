import { prisma } from "@/lib/db";

/**
 * DB-backed sliding-window rate limiter (ADR-023). The Platform Architecture
 * Blueprint §11 calls for a "Redis-backed sliding-window limiter... called
 * from the same guard position as requireRole()/requireOwnership()" on
 * signup, Inquiry creation, Message creation, and Review submission — no
 * Redis/Upstash infrastructure exists anywhere in this project yet (unlike
 * Neon/Cloudinary/Stripe, which are at least documented as pending), so this
 * starts on Postgres, which the app already depends on unconditionally.
 * Same "start simple, documented graduation path" pattern as ADR-015's
 * DB-backed job queue — swap the storage backend here for Redis if/when hit
 * volume genuinely demands it; every call site is unaffected either way.
 */

export interface RateLimitConfig {
  limit: number;
  windowSeconds: number;
}

export interface RateLimitResult {
  allowed: boolean;
  /** Only set when allowed is false. */
  retryAfterSeconds?: number;
}

/** Tuned, documented presets — the only place these numbers should live. */
export const RATE_LIMITS = {
  SIGNUP: { limit: 5, windowSeconds: 60 * 60 } satisfies RateLimitConfig,
  INQUIRY_CREATE: { limit: 10, windowSeconds: 60 * 60 } satisfies RateLimitConfig,
  MESSAGE_SEND: { limit: 30, windowSeconds: 5 * 60 } satisfies RateLimitConfig,
  REVIEW_SUBMIT: { limit: 10, windowSeconds: 24 * 60 * 60 } satisfies RateLimitConfig,
  /** Keyed by IP — catches one source credential-stuffing across many accounts. */
  LOGIN_IP: { limit: 20, windowSeconds: 15 * 60 } satisfies RateLimitConfig,
  /** Keyed by email — catches distributed brute-force against one target account. */
  LOGIN_EMAIL: { limit: 5, windowSeconds: 15 * 60 } satisfies RateLimitConfig,
  FORGOT_PASSWORD: { limit: 5, windowSeconds: 60 * 60 } satisfies RateLimitConfig,
  CONTACT_FORM: { limit: 5, windowSeconds: 60 * 60 } satisfies RateLimitConfig,
  /** Requesting a booking login code — keyed by IP (catches mass-requesting across many emails). */
  BOOKING_OTP_REQUEST_IP: { limit: 8, windowSeconds: 15 * 60 } satisfies RateLimitConfig,
  /** Same, keyed by email (catches hammering one target's inbox). */
  BOOKING_OTP_REQUEST_EMAIL: { limit: 4, windowSeconds: 15 * 60 } satisfies RateLimitConfig,
  /** Verifying a booking login code — keyed by IP. */
  BOOKING_OTP_VERIFY_IP: { limit: 20, windowSeconds: 15 * 60 } satisfies RateLimitConfig,
  /** Same, keyed by email (bounds brute-forcing one email's 6-digit code). */
  BOOKING_OTP_VERIFY_EMAIL: { limit: 8, windowSeconds: 15 * 60 } satisfies RateLimitConfig,
};

/**
 * Records a hit and reports whether `key` is still within its limit for the
 * trailing `windowSeconds`. Call this once per attempt, immediately after
 * the auth guard — same position `requireRole()`/`requireOwnership()` sit
 * in, per the blueprint's stated enforcement convention.
 */
export async function checkRateLimit(key: string, config: RateLimitConfig): Promise<RateLimitResult> {
  const windowStart = new Date(Date.now() - config.windowSeconds * 1000);

  const count = await prisma.rateLimitHit.count({
    where: { key, createdAt: { gte: windowStart } },
  });

  if (count >= config.limit) {
    const oldestInWindow = await prisma.rateLimitHit.findFirst({
      where: { key, createdAt: { gte: windowStart } },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    });
    const retryAfterSeconds = oldestInWindow
      ? Math.max(1, Math.ceil((oldestInWindow.createdAt.getTime() + config.windowSeconds * 1000 - Date.now()) / 1000))
      : config.windowSeconds;
    return { allowed: false, retryAfterSeconds };
  }

  // Opportunistic cleanup: this key's own stale hits, on its own successful check
  // — bounds table growth per-key without needing a separate sweep job for the
  // low volumes these four endpoints see. A global sweep is a documented,
  // not-yet-needed follow-up if hit volume ever changes that calculus.
  await prisma.$transaction([
    prisma.rateLimitHit.deleteMany({ where: { key, createdAt: { lt: windowStart } } }),
    prisma.rateLimitHit.create({ data: { key } }),
  ]);

  return { allowed: true };
}
