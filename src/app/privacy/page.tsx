import React from "react";
import { sanityClient } from "@/lib/sanity/client";
import { pageBySlugQuery } from "@/lib/sanity/queries";
import PortableTextBody from "@/components/sanity/PortableTextBody";

export const revalidate = 3600;

export const metadata = {
  title: "Privacy Policy",
};

interface SanityPage {
  title: string;
  body: unknown;
}

async function getPage(): Promise<SanityPage | null> {
  if (!process.env.NEXT_PUBLIC_SANITY_PROJECT_ID) return null;
  try {
    const result = await sanityClient.fetch<SanityPage | null>(pageBySlugQuery, { slug: "privacy" });
    return result;
  } catch {
    return null;
  }
}

const FALLBACK_SECTIONS: { heading: string; body: string }[] = [
  { heading: "1. Information we collect", body: "When you create an account, book a stay, or list a property on Potomac, we collect information you provide directly — your name, email address, phone number, payment details, and any messages you exchange with hosts or guests. We also collect information automatically, such as your IP address, browser type, and how you use the site, to keep the platform secure and improve the experience." },
  { heading: "2. How we use your information", body: "We use your information to process bookings and payments, connect guests with hosts, send account and transaction notifications, prevent fraud, and comply with legal obligations. We do not sell your personal information to third parties." },
  { heading: "3. Payment processing", body: "Payments are processed by Stripe. Potomac never stores your full card number — Stripe handles payment data directly under its own security and privacy standards." },
  { heading: "4. Sharing between guests and hosts", body: "To complete a booking, we share the information necessary for the stay to happen — for example, a guest's name and contact details are shared with their host once a booking is confirmed, and a host's listing address is shared with confirmed guests." },
  { heading: "5. Cookies", body: "We use essential cookies to keep you signed in and to remember preferences like dark mode. We do not use third-party advertising or tracking cookies." },
  { heading: "6. Your rights", body: "You can access, update, or delete most of your account information directly from your account settings at any time. To request a full copy or deletion of your data, contact us using the details below." },
  { heading: "7. Contact us", body: "Questions about this policy or your data? Reach us at support@potomac.com." },
];

export default async function PagePrivacy() {
  const page = await getPage();

  return (
    <div className="nc-PagePrivacy overflow-hidden">
      <div className="container py-16 lg:py-28">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-semibold">{page?.title ?? "Privacy Policy"}</h1>

          {page ? (
            <div className="mt-10">
              <PortableTextBody value={page.body} />
            </div>
          ) : (
            <div className="mt-10 space-y-8 text-neutral-600 dark:text-neutral-300 leading-relaxed">
              {FALLBACK_SECTIONS.map((section) => (
                <section key={section.heading}>
                  <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
                    {section.heading}
                  </h3>
                  <p>{section.body}</p>
                </section>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
