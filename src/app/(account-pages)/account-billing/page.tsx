import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getOnboardingStatus } from "@/modules/payments/actions";
import PayoutOnboarding from "./PayoutOnboarding";

export const metadata = {
  title: "Payments & Payouts",
};

const AccountBilling = async () => {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const result = await getOnboardingStatus();
  const initialStatus = result.success ? result.data : { hasAccount: false, status: null };

  return (
    <div className="space-y-6 sm:space-y-8">
      <h2 className="text-3xl font-semibold">Payments &amp; Payouts</h2>
      <div className="w-14 border-b border-neutral-200 dark:border-neutral-700" />
      <div className="max-w-2xl">
        <span className="text-xl font-semibold block">Payout account</span>
        <span className="text-neutral-700 dark:text-neutral-300 block mt-2">
          Connect a Stripe account to receive payouts as a host. Onboarding is
          hosted by Stripe — we never see or store your bank details.
        </span>
        <div className="pt-6">
          <PayoutOnboarding initialStatus={initialStatus} />
        </div>
      </div>
    </div>
  );
};

export default AccountBilling;
