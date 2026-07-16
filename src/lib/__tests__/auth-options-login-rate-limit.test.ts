import { describe, it, expect, beforeAll, afterAll } from "vitest";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { authOptions } from "../auth-options";

/**
 * Exercises the credentials provider's `authorize()` directly (real DB, no
 * mocking) — the same integration-test style used elsewhere in this project
 * — to verify the login rate limiter (release-readiness §4) actually blocks
 * repeated attempts rather than just being wired and never firing.
 */

const USER_ID = "ee000000-0000-4000-a000-000000000003";
const EMAIL = "login-rate-limit-test@example.com";
const PASSWORD = "correct-horse-battery-staple";

// `CredentialsProvider(options)` returns a base object whose own `authorize`
// is a stub (`() => null`) — NextAuth's internal init merges `.options` over
// it at request time. The real authorize function under test lives at
// `.options.authorize`, not the top-level property.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const provider = (authOptions.providers[0] as any).options;

function req(ip: string) {
  return { headers: { "x-forwarded-for": ip }, query: {}, body: {}, method: "POST" };
}

beforeAll(async () => {
  const passwordHash = await bcrypt.hash(PASSWORD, 12);
  await prisma.user.upsert({
    where: { id: USER_ID },
    create: { id: USER_ID, email: EMAIL, firstName: "Login", lastName: "Test", roles: ["CUSTOMER"], passwordHash, status: "ACTIVE" },
    update: { passwordHash, status: "ACTIVE" },
  });
});

afterAll(async () => {
  await prisma.rateLimitHit.deleteMany({ where: { key: { in: [`login-email:${EMAIL}`] } } });
  await prisma.rateLimitHit.deleteMany({ where: { key: { startsWith: "login-ip:rate-limit-test-ip" } } });
  await prisma.user.deleteMany({ where: { id: USER_ID } });
});

describe("credentials provider authorize() — login rate limiting", () => {
  it("allows correct login while under the per-email limit", async () => {
    const user = await provider.authorize({ email: EMAIL, password: PASSWORD }, req("rate-limit-test-ip-1"));
    expect(user?.id).toBe(USER_ID);
  });

  it("throws RATE_LIMITED once the per-email attempt budget is exhausted", async () => {
    // One successful call already happened above; RATE_LIMITS.LOGIN_EMAIL limit is 5,
    // so 4 more (wrong-password, still counted) exhausts it, and the 6th call throws.
    let threw = false;
    for (let i = 0; i < 6; i++) {
      try {
        await provider.authorize({ email: EMAIL, password: "wrong-password" }, req("rate-limit-test-ip-2"));
      } catch (err) {
        threw = true;
        expect((err as Error).message).toBe("RATE_LIMITED");
        break;
      }
    }
    expect(threw).toBe(true);
  });
});
