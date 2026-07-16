import React from "react";

export const metadata = {
  title: "Privacy Policy",
};

const PagePrivacy: React.FC = () => {
  return (
    <div className="nc-PagePrivacy overflow-hidden">
      <div className="container py-16 lg:py-28">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-semibold">Privacy Policy</h2>
          <p className="mt-3 text-neutral-500 dark:text-neutral-400">
            Last updated: July 16, 2026
          </p>

          <div className="mt-10 space-y-8 text-neutral-600 dark:text-neutral-300 leading-relaxed">
            <section>
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
                1. Information we collect
              </h3>
              <p>
                When you create an account, book a stay, or list a property on Potomac, we collect
                information you provide directly — your name, email address, phone number, payment
                details, and any messages you exchange with hosts or guests. We also collect
                information automatically, such as your IP address, browser type, and how you use
                the site, to keep the platform secure and improve the experience.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
                2. How we use your information
              </h3>
              <p>
                We use your information to process bookings and payments, connect guests with
                hosts, send account and transaction notifications, prevent fraud, and comply with
                legal obligations. We do not sell your personal information to third parties.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
                3. Payment processing
              </h3>
              <p>
                Payments are processed by Stripe. Potomac never stores your full card number —
                Stripe handles payment data directly under its own security and privacy standards.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
                4. Sharing between guests and hosts
              </h3>
              <p>
                To complete a booking, we share the information necessary for the stay to happen —
                for example, a guest's name and contact details are shared with their host once a
                booking is confirmed, and a host's listing address is shared with confirmed guests.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
                5. Cookies
              </h3>
              <p>
                We use essential cookies to keep you signed in and to remember preferences like
                dark mode. We do not use third-party advertising or tracking cookies.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
                6. Your rights
              </h3>
              <p>
                You can access, update, or delete most of your account information directly from
                your account settings at any time. To request a full copy or deletion of your
                data, contact us using the details below.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
                7. Contact us
              </h3>
              <p>
                Questions about this policy or your data? Reach us at{" "}
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

export default PagePrivacy;
