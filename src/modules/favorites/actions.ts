"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import type { ActionResult } from "@/lib/validations/auth";

export async function toggleFavorite(listingId: string): Promise<ActionResult<{ favorited: boolean }>> {
  const user = await requireAuth();

  const listing = await prisma.listing.findUnique({ where: { id: listingId }, select: { id: true, slug: true } });
  if (!listing) {
    return { success: false, error: { code: "NOT_FOUND", message: "Listing not found" } };
  }

  const existing = await prisma.favorite.findUnique({
    where: { userId_listingId: { userId: user.id, listingId } },
    select: { id: true },
  });

  if (existing) {
    await prisma.favorite.delete({ where: { id: existing.id } });
    revalidatePath("/account-savelists");
    revalidatePath(`/listing-stay-detail/${listing.slug}`);
    return { success: true, data: { favorited: false } };
  }

  await prisma.favorite.create({ data: { userId: user.id, listingId } });
  revalidatePath("/account-savelists");
  revalidatePath(`/listing-stay-detail/${listing.slug}`);
  return { success: true, data: { favorited: true } };
}
