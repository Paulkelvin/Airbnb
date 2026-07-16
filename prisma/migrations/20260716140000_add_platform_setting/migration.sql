-- CreateTable
CREATE TABLE "PlatformSetting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformSetting_pkey" PRIMARY KEY ("key")
);

-- Seed defaults
INSERT INTO "PlatformSetting" ("key", "value", "updatedAt")
VALUES
  ('listingModerationEnabled', 'false', NOW()),
  ('serviceFeePercent', '10', NOW())
ON CONFLICT ("key") DO NOTHING;
