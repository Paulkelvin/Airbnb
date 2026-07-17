import { prisma } from "@/lib/db";

export async function getSetting(key: string): Promise<string | null> {
  const row = await prisma.platformSetting.findUnique({ where: { key } });
  return row?.value ?? null;
}

/** Defaults to on (admin reviews every listing) until an admin explicitly opts out in /admin/settings. */
export async function isListingModerationEnabled(): Promise<boolean> {
  return (await getSetting("listingModerationEnabled")) !== "false";
}

export async function getServiceFeePercent(): Promise<number> {
  const val = await getSetting("serviceFeePercent");
  return val ? Number(val) : 10;
}
