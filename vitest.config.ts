import { defineConfig } from "vitest/config";
import path from "path";
import fs from "fs";

// Load env vars for integration tests that need DATABASE_URL (Next.js does
// this automatically at runtime; a standalone vitest process doesn't). A
// minimal manual parser rather than process.loadEnvFile (Node 20.6+) so this
// doesn't depend on @types/node picking up that API under the project's
// tsconfig.
function loadEnvFile(filePath: string) {
  for (const line of fs.readFileSync(filePath, "utf-8").split("\n")) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (!match) continue;
    const key = match[1];
    let value = (match[2] ?? "").trim();
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
    if (!(key in process.env)) process.env[key] = value;
  }
}

// Test-database safety (project-status.md §10, finding C5): this suite runs
// real DB-writing integration tests. `.env.test` (gitignored, not committed)
// is the intended place to point at a dedicated test database.
const testEnvPath = path.resolve(__dirname, ".env.test");
const envPath = path.resolve(__dirname, ".env");
const hasDedicatedTestEnv = fs.existsSync(testEnvPath);
if (hasDedicatedTestEnv) {
  loadEnvFile(testEnvPath);
} else if (fs.existsSync(envPath)) {
  loadEnvFile(envPath);
}

// The check above only covers *files* — it doesn't catch DATABASE_URL
// already being set in the ambient process environment (exactly how Vercel,
// CI, and this project's own sandbox sessions provide it, per finding C5:
// this sandbox's DATABASE_URL has pointed directly at the real Neon
// production instance). So gate on the actually-effective DATABASE_URL, not
// on which file (if any) was loaded: without a dedicated `.env.test`,
// running tests against whatever DATABASE_URL happens to be set requires an
// explicit opt-in — the same pattern this project already uses for
// `prisma/seed-dev-data.ts`'s ALLOW_DEV_SEED guard.
if (process.env.DATABASE_URL && !hasDedicatedTestEnv && process.env.ALLOW_TESTS_AGAINST_DOTENV !== "1") {
  const host = (() => {
    try {
      return new URL(process.env.DATABASE_URL!).hostname;
    } catch {
      return "(unparseable DATABASE_URL)";
    }
  })();
  throw new Error(
    `\nRefusing to run tests: no .env.test found, and DATABASE_URL is set to a host ` +
      `(${host}) with no way to confirm it isn't production.\n\n` +
      "Fix: create .env.test (gitignored) with a DATABASE_URL/DATABASE_URL_UNPOOLED pointing " +
      "at a dedicated test database (a separate Neon branch or local Postgres with postgis+" +
      "pgcrypto).\n\n" +
      "Or, if you've already confirmed the current DATABASE_URL is safe to write test data " +
      "into, set ALLOW_TESTS_AGAINST_DOTENV=1 to proceed anyway.\n",
  );
}

if (process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production") {
  throw new Error("Refusing to run tests: NODE_ENV/VERCEL_ENV indicates production.");
}

export default defineConfig({
  test: {
    environment: "node",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
