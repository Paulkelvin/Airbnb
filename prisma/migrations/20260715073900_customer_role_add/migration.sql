-- Replace GUEST with CUSTOMER in UserRole: GUEST becomes an implicit
-- (unauthenticated, unstored) concept; every persisted User carries at
-- least CUSTOMER. No User rows exist yet at this point in Phase 2, so a
-- direct enum-label cast is sufficient (no GUEST values to remap).

CREATE TYPE "UserRole_new" AS ENUM ('CUSTOMER', 'HOST', 'ADMIN');

ALTER TABLE "User" ALTER COLUMN "roles" DROP DEFAULT;

ALTER TABLE "User" ALTER COLUMN "roles" TYPE "UserRole_new"[]
  USING ("roles"::text[]::"UserRole_new"[]);

ALTER TABLE "User" ALTER COLUMN "roles" SET DEFAULT ARRAY['CUSTOMER']::"UserRole_new"[];

DROP TYPE "UserRole";

ALTER TYPE "UserRole_new" RENAME TO "UserRole";
