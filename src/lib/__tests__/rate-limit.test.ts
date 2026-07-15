import { describe, it, expect, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";

/**
 * Integration test against the real database for the DB-backed sliding-window
 * limiter (ADR-023). No mocking — exercises the real count/prune/insert path.
 */

const KEY_PREFIX = "ratelimit-test:";

afterAll(async () => {
  await prisma.rateLimitHit.deleteMany({ where: { key: { startsWith: KEY_PREFIX } } });
  await prisma.$disconnect();
});

describe("checkRateLimit", () => {
  it("allows requests under the limit and denies once the limit is hit", async () => {
    const key = `${KEY_PREFIX}basic-${crypto.randomUUID()}`;
    const config = { limit: 3, windowSeconds: 3600 };

    for (let i = 0; i < 3; i++) {
      const result = await checkRateLimit(key, config);
      expect(result.allowed).toBe(true);
    }

    const denied = await checkRateLimit(key, config);
    expect(denied.allowed).toBe(false);
    expect(denied.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("tracks separate keys independently", async () => {
    const keyA = `${KEY_PREFIX}indep-a-${crypto.randomUUID()}`;
    const keyB = `${KEY_PREFIX}indep-b-${crypto.randomUUID()}`;
    const config = { limit: 1, windowSeconds: 3600 };

    expect((await checkRateLimit(keyA, config)).allowed).toBe(true);
    expect((await checkRateLimit(keyA, config)).allowed).toBe(false);
    expect((await checkRateLimit(keyB, config)).allowed).toBe(true);
  });

  it("prunes hits outside the window so an expired window allows again", async () => {
    const key = `${KEY_PREFIX}window-${crypto.randomUUID()}`;
    // Insert a hit that's already outside a 1-second window.
    await prisma.rateLimitHit.create({
      data: { key, createdAt: new Date(Date.now() - 5000) },
    });

    const result = await checkRateLimit(key, { limit: 1, windowSeconds: 1 });
    expect(result.allowed).toBe(true);

    const remaining = await prisma.rateLimitHit.count({ where: { key } });
    // The stale hit was pruned and exactly one fresh hit was recorded.
    expect(remaining).toBe(1);
  });
});
