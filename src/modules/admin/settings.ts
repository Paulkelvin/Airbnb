import { prisma } from "@/lib/db";

export async function getSetting(key: string): Promise<string | null> {
  const row = await prisma.platformSetting.findUnique({ where: { key } });
  return row?.value ?? null;
}

export async function isListingModerationEnabled(): Promise<boolean> {
  return (await getSetting("listingModerationEnabled")) === "true";
}

export async function getServiceFeePercent(): Promise<number> {
  const val = await getSetting("serviceFeePercent");
  return val ? Number(val) : 10;
}
