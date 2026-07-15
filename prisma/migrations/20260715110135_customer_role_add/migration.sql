/*
  Warnings:

  - You are about to drop the column `location` on the `Address` table. All the data in the column will be lost.
  - You are about to drop the column `searchVector` on the `Listing` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Address_location_gist_idx";

-- DropIndex
DROP INDEX "Listing_searchVector_gin_idx";

-- AlterTable
ALTER TABLE "Address" DROP COLUMN "location";

-- AlterTable
ALTER TABLE "Listing" DROP COLUMN "searchVector";
