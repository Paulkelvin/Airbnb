import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

const US_CITIES_SEED: { name: string; region: string }[] = JSON.parse(
  fs.readFileSync(path.join(__dirname, "data", "usCitiesSeed.json"), "utf8"),
);

function slugify(name: string, region: string): string {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `${base}-${region.toLowerCase()}`;
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

/**
 * Idempotent — safe to run on every deploy. `skipDuplicates` means it only
 * inserts cities that don't already exist by (name, region) or slug; never
 * touches an existing row, so an admin's deactivate/rename is never
 * overwritten by a re-run. Bulk-inserted in chunks (not one upsert per row —
 * ~32,000 US Census places would be far too slow one at a time).
 */
async function main() {
  const rows = US_CITIES_SEED.map((city) => ({
    name: city.name,
    region: city.region,
    slug: slugify(city.name, city.region),
  }));

  const before = await prisma.city.count();

  let inserted = 0;
  for (const batch of chunk(rows, 5000)) {
    const result = await prisma.city.createMany({ data: batch, skipDuplicates: true });
    inserted += result.count;
  }

  const after = await prisma.city.count();
  console.log(
    `City seed complete — ${inserted} new rows inserted (table went from ${before} to ${after}).`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
