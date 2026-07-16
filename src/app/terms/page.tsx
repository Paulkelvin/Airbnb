import React from "react";

export const metadata = {
  title: "Terms of Service",
};

const PageTerms: React.FC = () => {
  return (
    <div className="nc-PageTerms overflow-hidden">
      <div className="container py-16 lg:py-28">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-semibold">Terms of Service</h2>
          <p className="mt-3 text-neutral-500 dark:text-neutral-400">
            Last updated: July 16, 2026
          </p>

          <div className="mt-10 space-y-8 text-neutral-600 dark:text-neutral-300 leading-relaxed">
            <section>
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
                1. Acceptance of terms
              </h3>
              <p>
                By creating an account or booking a stay through Potomac, you agree to these
                Terms of Service. If you do not agree, please do not use the platform.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
                2. Who can use Potomac
              </h3>
              <p>
                You must be at least 18 years old and able to form a legally binding contract to
                book a stay or list a property. You're responsible for keeping your account
                credentials secure and for all activity under your account.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
                3. Bookings and payments
              </h3>
              <p>
                Short-term stays are charged in full at the time of booking; long-term leases
                follow the payment schedule agreed with the host. All payments are processed
                securely through Stripe. Prices, fees, and cancellation policies are shown clearly
                before you confirm a booking.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
                4. Cancellations and refunds
              </h3>
              <p>
                Each listing displays its own cancellation policy (Flexible, Moderate, or Strict).
                Refund eligibility is determined by that policy and the timing of your
                cancellation relative to check-in.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
                5. Host responsibilities
              </h3>
              <p>
                Hosts agree to accurately represent their property, honor confirmed bookings,
                maintain a safe and habitable space, and comply with local laws applicable to
                short-term or long-term rentals in their jurisdiction.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
                6. Guest responsibilities
              </h3>
              <p>
                Guests agree to treat properties with care, follow each listing's house rules, and
                report any issues to their host or Potomac support promptly.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
                7. Prohibited conduct
              </h3>
              <p>
                You may not use Potomac for fraudulent bookings, harassment, discrimination, or
                any activity that violates applicable law. Accounts found in violation may be
                suspended or terminated.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
                8. Limitation of liability
              </h3>
              <p>
                Potomac connects guests and hosts but is not a party to the rental agreement
                between them. To the extent permitted by law, Potomac is not liable for the
                condition of a listed property or the conduct of any guest or host.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
                9. Changes to these terms
              </h3>
              <p>
                We may update these terms from time to time. Continued use of Potomac after a
                change means you accept the updated terms.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
                10. Contact us
              </h3>
              <p>
                Questions about these terms? Reach us at{" "}
                <a href="mailto:support@potomac.com" className="text-primary-600 underline">
                  support@potomac.com
                </a>
                .
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PageTerms;
