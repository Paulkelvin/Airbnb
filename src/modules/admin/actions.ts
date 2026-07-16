"use server";

import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import type { BookingStatus } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { notify } from "@/modules/notifications/notify";

type ActionResult<T> = { success: true; data: T } | { success: false; error: { code: string; message: string } };

async function auditLog(actorId: string, action: string, targetType: string, targetId: string, metadata?: Record<string, unknown>) {
  await prisma.auditLog.create({
    data: { actorId, action, targetType, targetId, metadata: (metadata ?? undefined) as Prisma.InputJsonValue | undefined },
  });
}

// ─── User Management ─────────────────────────────────────────────────────────

export async function suspendUser(userId: string): Promise<ActionResult<{ id: string }>> {
  const admin = await requireAdmin();
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, status: true } });
  if (!user) return { success: false, error: { code: "NOT_FOUND", message: "User not found" } };
  if (user.status === "SUSPENDED") return { success: false, error: { code: "INVALID_STATE", message: "User is already suspended" } };

  await prisma.user.update({ where: { id: userId }, data: { status: "SUSPENDED" } });
  await auditLog(admin.id, "user.suspend", "User", userId);
  revalidatePath("/admin/users");
  return { success: true, data: { id: userId } };
}

export async function unsuspendUser(userId: string): Promise<ActionResult<{ id: string }>> {
  const admin = await requireAdmin();
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, status: true } });
  if (!user) return { success: false, error: { code: "NOT_FOUND", message: "User not found" } };
  if (user.status !== "SUSPENDED") return { success: false, error: { code: "INVALID_STATE", message: "User is not suspended" } };

  await prisma.user.update({ where: { id: userId }, data: { status: "ACTIVE" } });
  await auditLog(admin.id, "user.unsuspend", "User", userId);
  revalidatePath("/admin/users");
  return { success: true, data: { id: userId } };
}

export async function verifyUser(userId: string): Promise<ActionResult<{ id: string }>> {
  const admin = await requireAdmin();
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, isVerified: true } });
  if (!user) return { success: false, error: { code: "NOT_FOUND", message: "User not found" } };
  if (user.isVerified) return { success: false, error: { code: "INVALID_STATE", message: "User is already verified" } };

  await prisma.user.update({ where: { id: userId }, data: { isVerified: true } });
  await auditLog(admin.id, "user.verify", "User", userId);
  revalidatePath("/admin/users");
  return { success: true, data: { id: userId } };
}

/** Grants or revokes the ADMIN role. Self-demotion is blocked so an admin can never lock themselves out. */
export async function setAdminRole(userId: string, makeAdmin: boolean): Promise<ActionResult<{ id: string }>> {
  const admin = await requireAdmin();
  if (!makeAdmin && userId === admin.id) {
    return { success: false, error: { code: "FORBIDDEN", message: "You cannot remove your own admin access" } };
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, roles: true } });
  if (!user) return { success: false, error: { code: "NOT_FOUND", message: "User not found" } };

  const hasAdmin = user.roles.includes("ADMIN");
  if (makeAdmin === hasAdmin) {
    return { success: true, data: { id: userId } };
  }

  const nextRoles = makeAdmin
    ? [...user.roles, "ADMIN" as const]
    : user.roles.filter((r) => r !== "ADMIN");

  await prisma.user.update({ where: { id: userId }, data: { roles: nextRoles } });
  await auditLog(admin.id, makeAdmin ? "user.grantAdmin" : "user.revokeAdmin", "User", userId);
  revalidatePath("/admin/users");
  return { success: true, data: { id: userId } };
}

// ─── Listing Moderation ──────────────────────────────────────────────────────

export async function approveListing(listingId: string): Promise<ActionResult<{ id: string }>> {
  const admin = await requireAdmin();
  const listing = await prisma.listing.findUnique({ where: { id: listingId }, select: { id: true, status: true, slug: true, title: true, hostId: true } });
  if (!listing) return { success: false, error: { code: "NOT_FOUND", message: "Listing not found" } };
  if (listing.status !== "PENDING_REVIEW") {
    return { success: false, error: { code: "INVALID_STATE", message: "Listing is not pending review" } };
  }

  await prisma.listing.update({
    where: { id: listingId },
    data: { status: "PUBLISHED", publishedAt: new Date() },
  });
  await auditLog(admin.id, "listing.approve", "Listing", listingId);
  await notify(listing.hostId, "LISTING_APPROVED", { listingId, listingTitle: listing.title, listingSlug: listing.slug });
  revalidatePath("/admin/listings");
  revalidatePath("/listing-stay");
  revalidatePath(`/listing-stay-detail/${listing.slug}`);
  return { success: true, data: { id: listingId } };
}

export async function rejectListing(listingId: string, reason?: string): Promise<ActionResult<{ id: string }>> {
  const admin = await requireAdmin();
  const listing = await prisma.listing.findUnique({ where: { id: listingId }, select: { id: true, status: true, title: true, hostId: true } });
  if (!listing) return { success: false, error: { code: "NOT_FOUND", message: "Listing not found" } };
  if (listing.status !== "PENDING_REVIEW") {
    return { success: false, error: { code: "INVALID_STATE", message: "Listing is not pending review" } };
  }

  await prisma.listing.update({ where: { id: listingId }, data: { status: "REJECTED" } });
  await auditLog(admin.id, "listing.reject", "Listing", listingId, reason ? { reason } : undefined);
  await notify(listing.hostId, "LISTING_REJECTED", { listingId, listingTitle: listing.title, reason });
  revalidatePath("/admin/listings");
  return { success: true, data: { id: listingId } };
}

export async function adminUnpublishListing(listingId: string, reason?: string): Promise<ActionResult<{ id: string }>> {
  const admin = await requireAdmin();
  const listing = await prisma.listing.findUnique({ where: { id: listingId }, select: { id: true, status: true, slug: true } });
  if (!listing) return { success: false, error: { code: "NOT_FOUND", message: "Listing not found" } };
  if (listing.status !== "PUBLISHED") {
    return { success: false, error: { code: "INVALID_STATE", message: "Listing is not published" } };
  }

  await prisma.listing.update({ where: { id: listingId }, data: { status: "PAUSED" } });
  await auditLog(admin.id, "listing.unpublish", "Listing", listingId, reason ? { reason } : undefined);
  revalidatePath("/admin/listings");
  revalidatePath("/listing-stay");
  revalidatePath(`/listing-stay-detail/${listing.slug}`);
  return { success: true, data: { id: listingId } };
}

// ─── Booking Dispute Resolution ──────────────────────────────────────────────

export async function adminForceBookingTransition(
  bookingId: string,
  nextStatus: BookingStatus,
  reason: string,
): Promise<ActionResult<{ id: string }>> {
  const admin = await requireAdmin();
  const booking = await prisma.booking.findUnique({ where: { id: bookingId }, select: { id: true, status: true } });
  if (!booking) return { success: false, error: { code: "NOT_FOUND", message: "Booking not found" } };

  const prev = booking.status;
  await prisma.booking.update({ where: { id: bookingId }, data: { status: nextStatus } });
  await auditLog(admin.id, "booking.forceTransition", "Booking", bookingId, { from: prev, to: nextStatus, reason });
  revalidatePath("/admin/bookings");
  return { success: true, data: { id: bookingId } };
}

// ─── Taxonomy Management ─────────────────────────────────────────────────────

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export async function createPropertyType(data: { name: string; description?: string; icon?: string }): Promise<ActionResult<{ id: string }>> {
  const admin = await requireAdmin();
  const slug = slugify(data.name);
  const existing = await prisma.propertyType.findFirst({ where: { OR: [{ name: data.name }, { slug }] } });
  if (existing) return { success: false, error: { code: "DUPLICATE", message: "A property type with this name already exists" } };

  const pt = await prisma.propertyType.create({
    data: { name: data.name, slug, description: data.description, icon: data.icon },
  });
  await auditLog(admin.id, "taxonomy.createPropertyType", "PropertyType", pt.id, { name: data.name, slug });
  revalidatePath("/admin/taxonomy");
  return { success: true, data: { id: pt.id } };
}

export async function updatePropertyType(id: string, data: { name?: string; description?: string; icon?: string; isActive?: boolean }): Promise<ActionResult<{ id: string }>> {
  const admin = await requireAdmin();
  const existing = await prisma.propertyType.findUnique({ where: { id } });
  if (!existing) return { success: false, error: { code: "NOT_FOUND", message: "Property type not found" } };

  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) {
    updateData.name = data.name;
    updateData.slug = slugify(data.name);
  }
  if (data.description !== undefined) updateData.description = data.description;
  if (data.icon !== undefined) updateData.icon = data.icon;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;

  await prisma.propertyType.update({ where: { id }, data: updateData });
  await auditLog(admin.id, "taxonomy.updatePropertyType", "PropertyType", id, data as Record<string, unknown>);
  revalidatePath("/admin/taxonomy");
  return { success: true, data: { id } };
}

export async function deletePropertyType(id: string): Promise<ActionResult<{ id: string }>> {
  const admin = await requireAdmin();
  const existing = await prisma.propertyType.findUnique({
    where: { id },
    select: { id: true, name: true, _count: { select: { listings: true } } },
  });
  if (!existing) return { success: false, error: { code: "NOT_FOUND", message: "Property type not found" } };
  if (existing._count.listings > 0) {
    return {
      success: false,
      error: {
        code: "IN_USE",
        message: `Can't delete — ${existing._count.listings} listing(s) still use this property type. Mark it inactive instead.`,
      },
    };
  }

  await prisma.propertyType.delete({ where: { id } });
  await auditLog(admin.id, "taxonomy.deletePropertyType", "PropertyType", id, { name: existing.name });
  revalidatePath("/admin/taxonomy");
  return { success: true, data: { id } };
}

export async function createAmenity(data: { name: string; category?: string; icon?: string }): Promise<ActionResult<{ id: string }>> {
  const admin = await requireAdmin();
  const slug = slugify(data.name);
  const existing = await prisma.amenity.findFirst({ where: { OR: [{ name: data.name }, { slug }] } });
  if (existing) return { success: false, error: { code: "DUPLICATE", message: "An amenity with this name already exists" } };

  const amenity = await prisma.amenity.create({
    data: {
      name: data.name,
      slug,
      category: data.category as never,
      icon: data.icon,
    },
  });
  await auditLog(admin.id, "taxonomy.createAmenity", "Amenity", amenity.id, { name: data.name, slug });
  revalidatePath("/admin/taxonomy");
  return { success: true, data: { id: amenity.id } };
}

export async function updateAmenity(id: string, data: { name?: string; category?: string; icon?: string; isActive?: boolean }): Promise<ActionResult<{ id: string }>> {
  const admin = await requireAdmin();
  const existing = await prisma.amenity.findUnique({ where: { id } });
  if (!existing) return { success: false, error: { code: "NOT_FOUND", message: "Amenity not found" } };

  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) {
    updateData.name = data.name;
    updateData.slug = slugify(data.name);
  }
  if (data.category !== undefined) updateData.category = data.category;
  if (data.icon !== undefined) updateData.icon = data.icon;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;

  await prisma.amenity.update({ where: { id }, data: updateData });
  await auditLog(admin.id, "taxonomy.updateAmenity", "Amenity", id, data as Record<string, unknown>);
  revalidatePath("/admin/taxonomy");
  return { success: true, data: { id } };
}

export async function deleteAmenity(id: string): Promise<ActionResult<{ id: string }>> {
  const admin = await requireAdmin();
  const existing = await prisma.amenity.findUnique({
    where: { id },
    select: { id: true, name: true, _count: { select: { listings: true } } },
  });
  if (!existing) return { success: false, error: { code: "NOT_FOUND", message: "Amenity not found" } };
  if (existing._count.listings > 0) {
    return {
      success: false,
      error: {
        code: "IN_USE",
        message: `Can't delete — ${existing._count.listings} listing(s) still use this amenity. Mark it inactive instead.`,
      },
    };
  }

  await prisma.amenity.delete({ where: { id } });
  await auditLog(admin.id, "taxonomy.deleteAmenity", "Amenity", id, { name: existing.name });
  revalidatePath("/admin/taxonomy");
  return { success: true, data: { id } };
}

// ─── Platform Settings ───────────────────────────────────────────────────────

export async function updatePlatformSetting(key: string, value: string): Promise<ActionResult<null>> {
  const admin = await requireAdmin();

  await prisma.platformSetting.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  });
  await auditLog(admin.id, "setting.update", "PlatformSetting", key, { key, value });
  revalidatePath("/admin/settings");
  return { success: true, data: null };
}
