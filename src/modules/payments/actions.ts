"use server";

import { prisma } from "@/lib/db";
import { requireAdmin, AuthError } from "@/lib/auth";
import { getPaymentProvider, type PayeeAccountStatus } from "@/lib/payments";
import type { ActionResult } from "@/lib/validations/auth";
import { getSiteUrl as getAppUrl } from "@/lib/site-url";

/**
 * This is a single-merchant site (see SquarePaymentProvider's class doc) —
 * there's one host (the site owner) and one Square account, so "onboarding"
 * is trivial by construction: createPayeeAccount/createOnboardingLink/
 * getAccountStatus are simplified, always-ready implementations rather than
 * a real Stripe-Connect-style flow. This action still exists (rather than
 * being deleted) so the account-billing page's status display keeps
 * working unchanged, and so a future real multi-host marketplace only has
 * to swap the provider's implementation of these methods, not this action.
 *
 * Marketplace mode is currently off, so payout onboarding is ADMIN-only
 * (`requireAdmin()`, not `requireAuth()`) — re-enabling public hosting is
 * just relaxing this gate back to `requireAuth()`.
 */
export async function startHostOnboarding(): Promise<ActionResult<{ url: string }>> {
  let user;
  try {
    user = await requireAdmin();
  } catch (err) {
    if (err instanceof AuthError) {
      return { success: false, error: { code: err.code, message: err.message } };
    }
    throw err;
  }
  const provider = getPaymentProvider();

  // Session doesn't carry payoutAccountRef — always read fresh from the DB rather
  // than risk a stale session token driving a duplicate account creation.
  const dbUser = await prisma.user.findUniqueOrThrow({
    where: { id: user.id },
    select: { payoutAccountRef: true },
  });
  let payoutAccountRef = dbUser.payoutAccountRef;

  if (!payoutAccountRef) {
    payoutAccountRef = await provider.createPayeeAccount({ id: user.id, email: user.email });
    await prisma.$transaction([
      prisma.user.update({ where: { id: user.id }, data: { payoutAccountRef } }),
      prisma.auditLog.create({
        data: {
          actorId: user.id,
          action: "PAYOUT_ACCOUNT_CREATED",
          targetType: "User",
          targetId: user.id,
          metadata: { payoutAccountRef },
        },
      }),
    ]);
  }

  const appUrl = getAppUrl();
  const url = await provider.createOnboardingLink(
    payoutAccountRef,
    `${appUrl}/account-billing?onboarding=refresh`,
    `${appUrl}/account-billing?onboarding=return`,
  );

  return { success: true, data: { url } };
}

export async function getOnboardingStatus(): Promise<
  ActionResult<{ hasAccount: boolean; status: PayeeAccountStatus | null }>
> {
  let user;
  try {
    user = await requireAdmin();
  } catch (err) {
    if (err instanceof AuthError) {
      return { success: false, error: { code: err.code, message: err.message } };
    }
    throw err;
  }
  const dbUser = await prisma.user.findUniqueOrThrow({
    where: { id: user.id },
    select: { payoutAccountRef: true },
  });

  if (!dbUser.payoutAccountRef) {
    return { success: true, data: { hasAccount: false, status: null } };
  }

  const provider = getPaymentProvider();
  const status = await provider.getAccountStatus(dbUser.payoutAccountRef);
  return { success: true, data: { hasAccount: true, status } };
}
