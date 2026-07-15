import { prisma } from "@/lib/db";
import { getPaymentProvider } from "@/lib/payments/stub-provider";
import { dollarsToCents } from "@/lib/pricing-policy";
import { canTransition } from "@/modules/bookings/status-machine";

/**
 * Date-driven booking lifecycle transitions (ADR-015: jobs are thin
 * orchestrators over existing module logic, triggered by a route handler
 * rather than an in-process scheduler at MVP). Every function here is safe
 * to re-run — each only touches bookings whose current status still makes
 * the transition valid, so a retried or overlapping run is a no-op on rows
 * already moved.
 */

function startOfDayUTC(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

async function runCheckInTransitions(referenceDate: Date): Promise<number> {
  const today = startOfDayUTC(referenceDate);
  const due = await prisma.booking.findMany({
    where: { rentalType: "SHORT_TERM", status: "CONFIRMED", checkInDate: { lte: today } },
    select: { id: true, status: true, rentalType: true },
  });
  const transitionable = due.filter((b) => canTransition(b.status, "CHECKED_IN", b.rentalType));
  if (transitionable.length > 0) {
    await prisma.booking.updateMany({
      where: { id: { in: transitionable.map((b) => b.id) } },
      data: { status: "CHECKED_IN" },
    });
  }
  return transitionable.length;
}

async function runCheckOutTransitions(referenceDate: Date): Promise<number> {
  const today = startOfDayUTC(referenceDate);
  const due = await prisma.booking.findMany({
    where: { rentalType: "SHORT_TERM", status: "CHECKED_IN", checkOutDate: { lte: today } },
    select: { id: true, status: true, rentalType: true },
  });
  const transitionable = due.filter((b) => canTransition(b.status, "COMPLETED", b.rentalType));
  if (transitionable.length > 0) {
    await prisma.booking.updateMany({
      where: { id: { in: transitionable.map((b) => b.id) } },
      data: { status: "COMPLETED" },
    });
  }
  return transitionable.length;
}

async function runLeaseActivations(referenceDate: Date): Promise<number> {
  const today = startOfDayUTC(referenceDate);
  const due = await prisma.booking.findMany({
    where: { rentalType: "LONG_TERM", status: "CONFIRMED", leaseStartDate: { lte: today } },
    select: { id: true, status: true, rentalType: true },
  });
  const transitionable = due.filter((b) => canTransition(b.status, "ACTIVE", b.rentalType));
  if (transitionable.length > 0) {
    await prisma.booking.updateMany({
      where: { id: { in: transitionable.map((b) => b.id) } },
      data: { status: "ACTIVE" },
    });
  }
  return transitionable.length;
}

async function runLeaseCompletions(referenceDate: Date): Promise<number> {
  const today = startOfDayUTC(referenceDate);
  const due = await prisma.booking.findMany({
    where: { rentalType: "LONG_TERM", status: "ACTIVE", leaseEndDate: { lte: today } },
    select: { id: true, status: true, rentalType: true },
  });
  const transitionable = due.filter((b) => canTransition(b.status, "COMPLETED", b.rentalType));
  if (transitionable.length > 0) {
    await prisma.booking.updateMany({
      where: { id: { in: transitionable.map((b) => b.id) } },
      data: { status: "COMPLETED" },
    });
  }
  return transitionable.length;
}

interface RentChargeResult {
  bookingId: string;
  charged: boolean;
  error?: string;
}

/**
 * Charges rent once per calendar month for every ACTIVE lease, on the day of
 * month closest to (without exceeding) `rentDueDayOfMonth` — e.g. a due day
 * of 31 charges on the 28th/29th/30th in a shorter month. Idempotent via the
 * `Payment.billingPeriodStart` marker: a lease already charged for the
 * current calendar month is skipped on a re-run.
 */
async function runMonthlyRentCharges(referenceDate: Date): Promise<RentChargeResult[]> {
  const year = referenceDate.getUTCFullYear();
  const month = referenceDate.getUTCMonth();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

  const activeLeases = await prisma.booking.findMany({
    where: { rentalType: "LONG_TERM", status: "ACTIVE" },
    select: {
      id: true,
      guestId: true,
      hostId: true,
      currency: true,
      rentDueDayOfMonth: true,
      monthlyRentSnapshot: true,
    },
  });

  const periodStart = new Date(Date.UTC(year, month, 1));
  const periodEnd = new Date(Date.UTC(year, month + 1, 0));
  const results: RentChargeResult[] = [];

  for (const lease of activeLeases) {
    if (!lease.rentDueDayOfMonth || !lease.monthlyRentSnapshot) continue;
    const dueDay = Math.min(lease.rentDueDayOfMonth, daysInMonth);
    if (referenceDate.getUTCDate() !== dueDay) continue;

    const alreadyCharged = await prisma.payment.findFirst({
      where: { bookingId: lease.id, type: "CHARGE", billingPeriodStart: periodStart },
      select: { id: true },
    });
    if (alreadyCharged) continue;

    const amountCents = dollarsToCents(Number(lease.monthlyRentSnapshot));
    const provider = getPaymentProvider();
    const result = await provider.createCharge(amountCents, lease.currency, lease.guestId, {
      bookingId: lease.id,
      payerUserId: lease.guestId,
      payeeUserId: lease.hostId,
      type: "CHARGE",
    });

    await prisma.payment.create({
      data: {
        bookingId: lease.id,
        payerUserId: lease.guestId,
        payeeUserId: lease.hostId,
        type: "CHARGE",
        amount: amountCents,
        currency: lease.currency,
        provider: "STRIPE_CONNECT",
        providerTransactionRef: result.providerTransactionRef,
        status: result.status === "SUCCEEDED" ? "SUCCEEDED" : "FAILED",
        failureReason: result.failureReason,
        billingPeriodStart: periodStart,
        billingPeriodEnd: periodEnd,
      },
    });

    results.push({ bookingId: lease.id, charged: result.status === "SUCCEEDED" });
  }

  return results;
}

export interface BookingLifecycleJobSummary {
  checkedIn: number;
  checkedOut: number;
  leasesActivated: number;
  leasesCompleted: number;
  rentCharges: RentChargeResult[];
}

export async function runBookingLifecycleJob(
  referenceDate: Date = new Date(),
): Promise<BookingLifecycleJobSummary> {
  const [checkedIn, checkedOut, leasesActivated, leasesCompleted, rentCharges] =
    await Promise.all([
      runCheckInTransitions(referenceDate),
      runCheckOutTransitions(referenceDate),
      runLeaseActivations(referenceDate),
      runLeaseCompletions(referenceDate),
      runMonthlyRentCharges(referenceDate),
    ]);

  return { checkedIn, checkedOut, leasesActivated, leasesCompleted, rentCharges };
}
