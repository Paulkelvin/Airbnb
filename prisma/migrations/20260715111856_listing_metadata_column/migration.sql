-- Adds the ADR-020 metadata escape hatch column. Prisma's diff engine does
-- not fully understand Unsupported()-typed generated columns (searchVector,
-- location) and proposes spurious DROP INDEX / ALTER COLUMN statements
-- against them on every unrelated schema change — those are stripped from
-- this migration by hand. Do not let `prisma migrate dev` apply its
-- auto-generated SQL unreviewed while these Unsupported columns exist;
-- always use --create-only and check the diff first.
ALTER TABLE "Listing" ADD COLUMN "metadata" JSONB;
