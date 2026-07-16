import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Neon's pooled host runs PgBouncer in transaction mode, which is
 * incompatible with Prisma's default prepared-statement caching — without
 * `pgbouncer=true` this surfaces as intermittent "prepared statement already
 * exists" errors under concurrent serverless invocations (e.g. right after a
 * burst of server actions), not a deterministic, always-reproducing bug.
 */
function pooledDatasourceUrl(): string | undefined {
  const url = process.env.DATABASE_URL;
  if (!url || /[?&]pgbouncer=/.test(url)) return url;
  return `${url}${url.includes("?") ? "&" : "?"}pgbouncer=true`;
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasourceUrl: pooledDatasourceUrl(),
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
