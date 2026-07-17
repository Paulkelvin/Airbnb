"use server";

import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import type { ListingStatus, BookingStatus, UserStatus } from "@prisma/client";

const PAGE_SIZE = 20;

export async function getAdminStats() {
  await requireAdmin();

  const [userCount, listingCount, bookingCount, pendingModerationCount, disputedCount, revenueResult] =
    await Promise.all([
      prisma.user.count({ where: { status: "ACTIVE" } }),
      prisma.listing.count({ where: { status: "PUBLISHED" } }),
      prisma.booking.count(),
      prisma.listing.count({ where: { status: "PENDING_REVIEW" } }),
      prisma.booking.count({ where: { status: "DISPUTED" } }),
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: { type: "CHARGE", status: "SUCCEEDED" },
      }),
    ]);

  return {
    userCount,
    listingCount,
    bookingCount,
    pendingModerationCount,
    disputedCount,
    totalRevenueCents: revenueResult._sum.amount ?? 0,
  };
}

export async function getAdminUsers(opts: {
  page?: number;
  status?: UserStatus;
  search?: string;
}) {
  await requireAdmin();
  const page = opts.page ?? 1;
  const skip = (page - 1) * PAGE_SIZE;

  const where: Record<string, unknown> = {};
  if (opts.status) where.status = opts.status;
  if (opts.search) {
    where.OR = [
      { email: { contains: opts.search, mode: "insensitive" } },
      { firstName: { contains: opts.search, mode: "insensitive" } },
      { lastName: { contains: opts.search, mode: "insensitive" } },
    ];
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: PAGE_SIZE,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        roles: true,
        status: true,
        isVerified: true,
        createdAt: true,
        _count: { select: { listings: true, bookingsAsGuest: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);

  return { users, total, page, pageSize: PAGE_SIZE, totalPages: Math.ceil(total / PAGE_SIZE) };
}

export async function getAdminListings(opts: {
  page?: number;
  status?: ListingStatus;
}) {
  await requireAdmin();
  const page = opts.page ?? 1;
  const skip = (page - 1) * PAGE_SIZE;

  const where: Record<string, unknown> = {};
  if (opts.status) where.status = opts.status;

  const [listings, total] = await Promise.all([
    prisma.listing.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: PAGE_SIZE,
      select: {
        id: true,
        title: true,
        slug: true,
        status: true,
        rentalType: true,
        createdAt: true,
        host: { select: { id: true, email: true, firstName: true, lastName: true } },
        images: { take: 1, orderBy: { position: "asc" }, select: { url: true } },
      },
    }),
    prisma.listing.count({ where }),
  ]);

  return { listings, total, page, pageSize: PAGE_SIZE, totalPages: Math.ceil(total / PAGE_SIZE) };
}

export async function getAdminBookings(opts: {
  page?: number;
  status?: BookingStatus;
}) {
  await requireAdmin();
  const page = opts.page ?? 1;
  const skip = (page - 1) * PAGE_SIZE;

  const where: Record<string, unknown> = {};
  if (opts.status) where.status = opts.status;

  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: PAGE_SIZE,
      select: {
        id: true,
        status: true,
        rentalType: true,
        totalPrice: true,
        checkInDate: true,
        checkOutDate: true,
        createdAt: true,
        guest: { select: { id: true, email: true, firstName: true, lastName: true } },
        listing: { select: { id: true, title: true, slug: true } },
      },
    }),
    prisma.booking.count({ where }),
  ]);

  return { bookings, total, page, pageSize: PAGE_SIZE, totalPages: Math.ceil(total / PAGE_SIZE) };
}

export async function getAdminPayments(opts: { page?: number }) {
  await requireAdmin();
  const page = opts.page ?? 1;
  const skip = (page - 1) * PAGE_SIZE;

  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      orderBy: { createdAt: "desc" },
      skip,
      take: PAGE_SIZE,
      select: {
        id: true,
        type: true,
        amount: true,
        currency: true,
        status: true,
        provider: true,
        createdAt: true,
        booking: { select: { id: true } },
        payer: { select: { email: true, firstName: true, lastName: true } },
        payee: { select: { email: true, firstName: true, lastName: true } },
      },
    }),
    prisma.payment.count(),
  ]);

  return { payments, total, page, pageSize: PAGE_SIZE, totalPages: Math.ceil(total / PAGE_SIZE) };
}

export async function getAuditLogs(opts: {
  page?: number;
  targetType?: string;
  actorId?: string;
}) {
  await requireAdmin();
  const page = opts.page ?? 1;
  const skip = (page - 1) * PAGE_SIZE;

  const where: Record<string, unknown> = {};
  if (opts.targetType) where.targetType = opts.targetType;
  if (opts.actorId) where.actorId = opts.actorId;

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: PAGE_SIZE,
      select: {
        id: true,
        action: true,
        targetType: true,
        targetId: true,
        metadata: true,
        createdAt: true,
        actor: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { logs, total, page, pageSize: PAGE_SIZE, totalPages: Math.ceil(total / PAGE_SIZE) };
}

export async function getPropertyTypes() {
  await requireAdmin();
  return prisma.propertyType.findMany({ orderBy: { name: "asc" } });
}

export async function getAmenities() {
  await requireAdmin();
  return prisma.amenity.findMany({ orderBy: { name: "asc" } });
}

export async function getCities(opts: { search?: string } = {}) {
  await requireAdmin();
  const where: Record<string, unknown> = {};
  if (opts.search) {
    where.OR = [
      { name: { contains: opts.search, mode: "insensitive" } },
      { region: { contains: opts.search, mode: "insensitive" } },
    ];
  }
  return prisma.city.findMany({ where, orderBy: [{ region: "asc" }, { name: "asc" }] });
}

export async function getPlatformSettings() {
  await requireAdmin();
  return prisma.platformSetting.findMany({ orderBy: { key: "asc" } });
}
