import React from "react";
import { sanityClient } from "@/lib/sanity/client";
import { pageBySlugQuery } from "@/lib/sanity/queries";
import PortableTextBody from "@/components/sanity/PortableTextBody";

export const revalidate = 3600;

export const metadata = {
  title: "Terms of Service",
};

interface SanityPage {
  title: string;
  body: unknown;
}

async function getPage(): Promise<SanityPage | null> {
  if (!process.env.NEXT_PUBLIC_SANITY_PROJECT_ID) return null;
  try {
    const result = await sanityClient.fetch<SanityPage | null>(pageBySlugQuery, { slug: "terms" });
    return result;
  } catch {
    return null;
  }
}

const FALLBACK_SECTIONS: { heading: string; body: string }[] = [
  { heading: "1. Acceptance of terms", body: "By creating an account or booking a stay through Potomac, you agree to these Terms of Service. If you do not agree, please do not use the platform." },
  { heading: "2. Who can use Potomac", body: "You must be at least 18 years old and able to form a legally binding contract to book a stay or list a property. You're responsible for keeping your account credentials secure and for all activity under your account." },
  { heading: "3. Bookings and payments", body: "Short-term stays are charged in full at the time of booking; long-term leases follow the payment schedule agreed with the host. All payments are processed securely through Stripe. Prices, fees, and cancellation policies are shown clearly before you confirm a booking." },
  { heading: "4. Cancellations and refunds", body: "Each listing displays its own cancellation policy (Flexible, Moderate, or Strict). Refund eligibility is determined by that policy and the timing of your cancellation relative to check-in." },
  { heading: "5. Host responsibilities", body: "Hosts agree to accurately represent their property, honor confirmed bookings, maintain a safe and habitable space, and comply with local laws applicable to short-term or long-term rentals in their jurisdiction." },
  { heading: "6. Guest responsibilities", body: "Guests agree to treat properties with care, follow each listing's house rules, and report any issues to their host or Potomac support promptly." },
  { heading: "7. Prohibited conduct", body: "You may not use Potomac for fraudulent bookings, harassment, discrimination, or any activity that violates applicable law. Accounts found in violation may be suspended or terminated." },
  { heading: "8. Limitation of liability", body: "Potomac connects guests and hosts but is not a party to the rental agreement between them. To the extent permitted by law, Potomac is not liable for the condition of a listed property or the conduct of any guest or host." },
  { heading: "9. Changes to these terms", body: "We may update these terms from time to time. Continued use of Potomac after a change means you accept the updated terms." },
  { heading: "10. Contact us", body: "Questions about these terms? Reach us at support@potomac.com." },
];

export default async function PageTerms() {
  const page = await getPage();

  return (
    <div className="nc-PageTerms overflow-hidden">
      <div className="container py-16 lg:py-28">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-semibold">{page?.title ?? "Terms of Service"}</h1>

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
