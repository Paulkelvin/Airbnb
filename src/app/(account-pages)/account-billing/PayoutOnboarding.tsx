"use client";

import { useEffect, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import ButtonPrimary from "@/components/ui/ButtonPrimary";
import ButtonSecondary from "@/components/ui/ButtonSecondary";
import { startHostOnboarding, getOnboardingStatus } from "@/modules/payments/actions";
import type { PayeeAccountStatus } from "@/lib/payments";

interface OnboardingStatus {
  hasAccount: boolean;
  status: PayeeAccountStatus | null;
}

export default function PayoutOnboarding({
  initialStatus,
}: {
  initialStatus: OnboardingStatus;
}) {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState(initialStatus);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (searchParams.get("onboarding") === "return") {
      startTransition(async () => {
        const result = await getOnboardingStatus();
        if (result.success) setStatus(result.data);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleConnect() {
    setError(null);
    startTransition(async () => {
      const result = await startHostOnboarding();
      if (!result.success) {
        setError(result.error.message);
        return;
      }
      window.location.href = result.data.url;
    });
  }

  function handleRefresh() {
    setError(null);
    startTransition(async () => {
      const result = await getOnboardingStatus();
      if (!result.success) {
        setError(result.error.message);
        return;
      }
      setStatus(result.data);
    });
  }

  const fullyOnboarded =
    status.hasAccount && status.status?.chargesEnabled && status.status?.payoutsEnabled;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-neutral-200 dark:border-neutral-700 p-5 space-y-2">
        {!status.hasAccount && (
          <p className="text-neutral-700 dark:text-neutral-300">
            You haven&apos;t connected a payout account yet.
          </p>
        )}
        {status.hasAccount && status.status && (
          <>
            <StatusRow label="Details submitted" ok={status.status.detailsSubmitted} />
            <StatusRow label="Charges enabled" ok={status.status.chargesEnabled} />
            <StatusRow label="Payouts enabled" ok={status.status.payoutsEnabled} />
          </>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-3">
        {!fullyOnboarded && (
          <ButtonPrimary disabled={isPending} loading={isPending} onClick={handleConnect}>
            {status.hasAccount ? "Continue onboarding" : "Connect with Stripe"}
          </ButtonPrimary>
        )}
        {status.hasAccount && (
          <ButtonSecondary disabled={isPending} onClick={handleRefresh}>
            Refresh status
          </ButtonSecondary>
        )}
      </div>
    </div>
  );
}

function StatusRow({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-neutral-600 dark:text-neutral-400">{label}</span>
      <span className={ok ? "text-green-600" : "text-yellow-600"}>{ok ? "Yes" : "Pending"}</span>
    </div>
  );
}
