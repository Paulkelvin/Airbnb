import { defineConfig } from "vitest/config";
import path from "path";
import fs from "fs";

// Load .env for integration tests that need DATABASE_URL (Next.js does this
// automatically at runtime; a standalone vitest process doesn't). A minimal
// manual parser rather than process.loadEnvFile (Node 20.6+) so this doesn't
// depend on @types/node picking up that API under the project's tsconfig.
const envPath = path.resolve(__dirname, ".env");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (!match) continue;
    const key = match[1];
    let value = (match[2] ?? "").trim();
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
    if (!(key in process.env)) process.env[key] = value;
  }
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
