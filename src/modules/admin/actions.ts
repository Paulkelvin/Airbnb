"use server";

import bcrypt from "bcryptjs";
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
  if (userId === admin.id) {
    return { success: false, error: { code: "FORBIDDEN", message: "You cannot suspend your own account" } };
  }
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, status: true } });
  if (!user) return { success: false, error: { code: "NOT_FOUND", message: "User not found" } };
  if (user.status !== "ACTIVE") return { success: false, error: { code: "INVALID_STATE", message: "Only active users can be suspended" } };

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
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, isVerified: true, status: true } });
  if (!user) return { success: false, error: { code: "NOT_FOUND", message: "User not found" } };
  if (user.status !== "ACTIVE") return { success: false, error: { code: "INVALID_STATE", message: "Only active users can be verified" } };
  if (user.isVerified) return { success: false, error: { code: "INVALID_STATE", message: "User is already verified" } };

  await prisma.user.update({ where: { id: userId }, data: { isVerified: true } });
  await auditLog(admin.id, "user.verify", "User", userId);
  revalidatePath("/admin/users");
  return { success: true, data: { id: userId } };
}

export async function deleteUser(userId: string): Promise<ActionResult<{ id: string }>> {
  const admin = await requireAdmin();
  if (userId === admin.id) {
    return { success: false, error: { code: "FORBIDDEN", message: "You cannot delete your own account" } };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      status: true,
      _count: {
        select: {
          bookingsAsGuest: { where: { status: { in: ["PENDING", "CONFIRMED", "ACTIVE", "CHECKED_IN"] } } },
          bookingsAsHost: { where: { status: { in: ["PENDING", "CONFIRMED", "ACTIVE", "CHECKED_IN"] } } },
        },
      },
    },
  });
  if (!user) return { success: false, error: { code: "NOT_FOUND", message: "User not found" } };
  if (user.status === "DELETED") return { success: false, error: { code: "INVALID_STATE", message: "User is already deleted" } };

  const activeBookings = user._count.bookingsAsGuest + user._count.bookingsAsHost;
  if (activeBookings > 0) {
    return {
      success: false,
      error: {
        code: "IN_USE",
        message: `Cannot delete — ${activeBookings} active booking(s) exist. Cancel or complete them first.`,
      },
    };
  }

  await prisma.$transaction([
    prisma.listing.updateMany({ where: { hostId: userId, status: "PUBLISHED" }, data: { status: "PAUSED" } }),
    prisma.user.update({
      where: { id: userId },
      data: {
        status: "DELETED",
        email: `deleted-${userId}@removed.local`,
        firstName: "Deleted",
        lastName: "User",
        phone: null,
        avatarUrl: null,
        bio: null,
        passwordHash: null,
        passwordResetToken: null,
        passwordResetExpiresAt: null,
      },
    }),
  ]);
  await auditLog(admin.id, "user.delete", "User", userId, { originalEmail: user.email });
  revalidatePath("/admin/users");
  return { success: true, data: { id: userId } };
}

/** Grants or revokes the ADMIN role. Self-demotion is blocked so an admin can never lock themselves out. */
export async function setAdminRole(userId: string, makeAdmin: boolean): Promise<ActionResult<{ id: string }>> {
  const admin = await requireAdmin();
  if (!makeAdmin && userId === admin.id) {
    return { success: false, error: { code: "FORBIDDEN", message: "You cannot remove your own admin access" } };
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, roles: true, status: true } });
  if (!user) return { success: false, error: { code: "NOT_FOUND", message: "User not found" } };
  if (user.status === "DELETED") return { success: false, error: { code: "INVALID_STATE", message: "Cannot change roles on a deleted user" } };

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

/** Creates a brand-new user with ADMIN + CUSTOMER roles, verified by default. */
export async function createAdminUser(data: {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
}): Promise<ActionResult<{ id: string }>> {
  const admin = await requireAdmin();

  const email = data.email.toLowerCase().trim();

  if (!email || !data.firstName.trim() || !data.lastName.trim() || !data.password) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "All fields are required" } };
  }
  if (data.password.length < 8) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "Password must be at least 8 characters" } };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { success: false, error: { code: "CONFLICT", message: "An account with this email already exists" } };
  }

  const passwordHash = await bcrypt.hash(data.password, 12);

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
      roles: ["CUSTOMER", "ADMIN"],
      isVerified: true,
    },
  });
  await auditLog(admin.id, "user.createAdmin", "User", user.id, { email });
  revalidatePath("/admin/users");
  return { success: true, data: { id: user.id } };
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

export async function adminDeleteListing(listingId: string): Promise<ActionResult<{ id: string }>> {
  const admin = await requireAdmin();
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: {
      id: true,
      title: true,
      hostId: true,
      _count: {
        select: {
          bookings: {
            where: { status: { in: ["PENDING", "CONFIRMED", "ACTIVE", "CHECKED_IN"] } },
          },
        },
      },
    },
  });
  if (!listing) return { success: false, error: { code: "NOT_FOUND", message: "Listing not found" } };
  if (listing._count.bookings > 0) {
    return {
      success: false,
      error: {
        code: "IN_USE",
        message: `Cannot delete — ${listing._count.bookings} active booking(s) exist. Cancel or complete them first.`,
      },
    };
  }

  await prisma.listing.delete({ where: { id: listingId } });
  await auditLog(admin.id, "listing.delete", "Listing", listingId, { title: listing.title });
  await notify(listing.hostId, "LISTING_REJECTED", { listingId, listingTitle: listing.title, reason: "Your listing has been permanently removed by an administrator." });
  revalidatePath("/admin/listings");
  revalidatePath("/listing-stay");
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

export async function updateAmenity(id: string, data: { name?: string; category?: string | null; icon?: string; isActive?: boolean }): Promise<ActionResult<{ id: string }>> {
  const admin = await requireAdmin();
  const existing = await prisma.amenity.findUnique({ where: { id } });
  if (!existing) return { success: false, error: { code: "NOT_FOUND", message: "Amenity not found" } };

  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) {
    updateData.name = data.name;
    updateData.slug = slugify(data.name);
  }
  if (data.category !== undefined) updateData.category = data.category || null;
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

// ─── City Taxonomy ────────────────────────────────────────────────────────────

function slugifyCity(name: string, region: string): string {
  return `${slugify(name)}-${region.toLowerCase()}`;
}

export async function createCity(data: { name: string; region: string }): Promise<ActionResult<{ id: string }>> {
  const admin = await requireAdmin();
  const name = data.name.trim();
  const region = data.region.trim().toUpperCase();
  if (!name || !region) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "City name and region are required" } };
  }

  const slug = slugifyCity(name, region);
  const existing = await prisma.city.findFirst({ where: { OR: [{ name, region }, { slug }] } });
  if (existing) return { success: false, error: { code: "DUPLICATE", message: "This city already exists" } };

  const city = await prisma.city.create({ data: { name, region, slug } });
  await auditLog(admin.id, "taxonomy.createCity", "City", city.id, { name, region, slug });
  revalidatePath("/admin/cities");
  return { success: true, data: { id: city.id } };
}

export async function updateCity(
  id: string,
  data: { name?: string; region?: string; isActive?: boolean },
): Promise<ActionResult<{ id: string }>> {
  const admin = await requireAdmin();
  const existing = await prisma.city.findUnique({ where: { id } });
  if (!existing) return { success: false, error: { code: "NOT_FOUND", message: "City not found" } };

  const name = data.name !== undefined ? data.name.trim() : existing.name;
  const region = data.region !== undefined ? data.region.trim().toUpperCase() : existing.region;

  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined || data.region !== undefined) {
    updateData.name = name;
    updateData.region = region;
    updateData.slug = slugifyCity(name, region);
  }
  if (data.isActive !== undefined) updateData.isActive = data.isActive;

  await prisma.city.update({ where: { id }, data: updateData });
  await auditLog(admin.id, "taxonomy.updateCity", "City", id, data as Record<string, unknown>);
  revalidatePath("/admin/cities");
  revalidatePath("/");
  return { success: true, data: { id } };
}

export async function deleteCity(id: string): Promise<ActionResult<{ id: string }>> {
  const admin = await requireAdmin();
  const existing = await prisma.city.findUnique({ where: { id }, select: { id: true, name: true } });
  if (!existing) return { success: false, error: { code: "NOT_FOUND", message: "City not found" } };

  await prisma.city.delete({ where: { id } });
  await auditLog(admin.id, "taxonomy.deleteCity", "City", id, { name: existing.name });
  revalidatePath("/admin/cities");
  revalidatePath("/");
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
