import { PrismaClient } from "@prisma/client";
import { US_CITIES_SEED } from "./data/usCitiesSeed";

const prisma = new PrismaClient();

function slugify(name: string, region: string): string {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `${base}-${region.toLowerCase()}`;
}

/**
 * Idempotent — safe to run on every deploy. Only inserts cities that don't
 * already exist by (name, region); never touches isActive on an existing row,
 * so an admin's deactivate/edit is never overwritten by a re-run.
 */
async function main() {
  let created = 0;
  for (const city of US_CITIES_SEED) {
    const result = await prisma.city.upsert({
      where: { name_region: { name: city.name, region: city.region } },
      create: { name: city.name, region: city.region, slug: slugify(city.name, city.region) },
      update: {},
    });
    if (result.createdAt.getTime() === result.updatedAt.getTime()) created++;
  }
  console.log(`City seed complete — ${created} new, ${US_CITIES_SEED.length - created} already present.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
