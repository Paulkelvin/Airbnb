import { prisma } from "@/lib/db";
import type { PayeeAccountStatus } from "@/lib/payments";

/**
 * Called only by the webhook handler on `account.updated` — not a
 * user-invoked Server Action (kept out of actions.ts for that reason).
 * Deliberately does not persist charges/payouts-enabled flags on User
 * (ADR-007: `payoutAccountRef` is the only payout-related field on User);
 * this just records the change for accountability, per the Domain Model
 * Spec's AuditLog scope ("payout-account changes"). Current status is
 * always fetched live via getOnboardingStatus() when actually needed.
 */
export async function syncPayeeAccountStatus(
  payoutAccountRef: string,
  status: PayeeAccountStatus,
): Promise<void> {
  const user = await prisma.user.findFirst({ where: { payoutAccountRef } });
  if (!user) return;

  await prisma.auditLog.create({
    data: {
      actorId: null,
      action: "PAYOUT_ACCOUNT_STATUS_UPDATED",
      targetType: "User",
      targetId: user.id,
      metadata: { ...status },
    },
  });
}
