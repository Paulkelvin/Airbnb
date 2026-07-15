-- Restores the PostGIS geography column and full-text search column that
-- were incorrectly dropped by migration 20260715110135_customer_role_add
-- (Prisma dropped them because they were raw-SQL additions not declared in
-- schema.prisma). Both are now declared as Unsupported() fields in the
-- schema so future `prisma migrate dev` runs will not attempt to drop them
-- again — but their generated-column/trigger mechanics still require raw SQL.

-- PostGIS geography column on Address for spatial queries
ALTER TABLE "Address" ADD COLUMN "location" geography(Point, 4326);
CREATE INDEX "Address_location_gist_idx" ON "Address" USING GIST ("location");

-- Trigger function may already exist from the original migration; replace to be safe.
CREATE OR REPLACE FUNCTION address_set_location() RETURNS trigger AS $$
BEGIN
  IF NEW."latitude" IS NOT NULL AND NEW."longitude" IS NOT NULL THEN
    NEW."location" := ST_SetSRID(ST_MakePoint(NEW."longitude", NEW."latitude"), 4326)::geography;
  ELSE
    NEW."location" := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_address_set_location ON "Address";
CREATE TRIGGER trg_address_set_location
  BEFORE INSERT OR UPDATE OF "latitude", "longitude" ON "Address"
  FOR EACH ROW EXECUTE FUNCTION address_set_location();

-- Full-text search on Listing (tsvector generated column + GIN index)
ALTER TABLE "Listing" ADD COLUMN "searchVector" tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce("title", '')), 'A') ||
    setweight(to_tsvector('english', coalesce("description", '')), 'B')
  ) STORED;
CREATE INDEX "Listing_searchVector_gin_idx" ON "Listing" USING GIN ("searchVector");
