export interface Faq {
  question: string;
  answer: string;
  category: string;
}

export const faqs: Faq[] = [
  {
    category: "Booking",
    question: "How do I book a stay on Potomac?",
    answer:
      "Search by destination and dates, open any listing you like, and select \"Reserve.\" You'll confirm your guest count, review the price breakdown, and pay securely — most stays confirm instantly, no waiting on host approval.",
  },
  {
    category: "Booking",
    question: "Can I book a long-term stay, not just a short vacation rental?",
    answer:
      "Yes. Potomac supports both short-term stays (nightly) and long-term rentals (monthly leases). Use the rental type toggle on the search page to switch between the two — long-term listings show monthly rent, minimum lease terms, and move-in availability.",
  },
  {
    category: "Payments",
    question: "Is my payment secure?",
    answer:
      "Your card details are encrypted and processed through Stripe — hosts never see your payment information. For short-term stays, funds are only released to the host after your check-in, so you're protected if something doesn't match the listing.",
  },
  {
    category: "Payments",
    question: "When am I charged for my booking?",
    answer:
      "You're charged in full at the time of booking for short-term stays. For long-term leases, the first month's rent and any security deposit are collected upfront, with subsequent rent payments following the schedule you agree with your host.",
  },
  {
    category: "Cancellations",
    question: "What is Potomac's cancellation policy?",
    answer:
      "Each listing sets its own cancellation policy — Flexible, Moderate, or Strict — shown clearly on the listing page and at checkout before you pay. You can view the exact refund timeline for your dates on the booking confirmation page at any time.",
  },
  {
    category: "Cancellations",
    question: "Can I get a refund if the property isn't as described?",
    answer:
      "Yes. If a listing is materially different from what was described (wrong location, missing amenities, unsafe conditions), contact our support team within 24 hours of check-in and we'll help you get a refund or find a comparable stay.",
  },
  {
    category: "Hosting",
    question: "How do I list my property on Potomac?",
    answer:
      "Create a host account, then use \"List your property\" to add photos, set your price, and describe your space. Listings go live after a quick review to verify photos and details match — most are approved within one business day.",
  },
  {
    category: "Hosting",
    question: "How and when do hosts get paid?",
    answer:
      "For short-term stays, payouts are released 24 hours after guest check-in, directly to your linked bank account. For long-term leases, rent is disbursed on the schedule set in your listing, typically monthly.",
  },
  {
    category: "Trust & Safety",
    question: "Are hosts and listings verified?",
    answer:
      "Every host completes identity verification before they can publish a listing, and our team reviews new listings for accuracy before they go live. Guest reviews after every stay keep that accountability ongoing.",
  },
  {
    category: "Trust & Safety",
    question: "What if I need help during my stay?",
    answer:
      "Message your host directly through Potomac for anything stay-specific. If you can't reach them or something's urgent, our support team is available around the clock from your account's Help Center.",
  },
];
