export interface Faq {
  question: string;
  answer: string;
  category: string;
}

export const faqs: Faq[] = [
  {
    category: "Booking",
    question: "How do I book Potomac Vista Cottage?",
    answer:
      "Pick your dates on the cottage's page and select \"Reserve.\" You'll confirm your guest count, review the price breakdown, and pay securely — most stays confirm instantly, no waiting on approval.",
  },
  {
    category: "Booking",
    question: "Is there a minimum or maximum length of stay?",
    answer:
      "The cottage's page shows its current minimum and maximum nights, along with the calendar of available dates. Both are set to keep turnover manageable while still working for weekend trips and longer getaways.",
  },
  {
    category: "Payments",
    question: "Is my payment secure?",
    answer:
      "Your card details are encrypted and processed through Stripe — we never see or store your payment information directly. Funds are only released after your check-in, so you're protected if something doesn't match what was described.",
  },
  {
    category: "Payments",
    question: "When am I charged for my booking?",
    answer:
      "You're charged in full at the time of booking, once your dates are confirmed.",
  },
  {
    category: "Cancellations",
    question: "What is the cancellation policy?",
    answer:
      "The cancellation policy — Flexible, Moderate, or Strict — is shown clearly on the cottage's page and at checkout before you pay. You can view the exact refund timeline for your dates on your booking confirmation at any time.",
  },
  {
    category: "Cancellations",
    question: "Can I get a refund if the cottage isn't as described?",
    answer:
      "Yes. If something is materially different from what was described (wrong details, missing amenities, unsafe conditions), contact our support team within 24 hours of check-in and we'll help you get a refund.",
  },
  {
    category: "Trust & Safety",
    question: "Who do I actually book with?",
    answer:
      "Potomac Vista Cottage is hosted directly by our team — there's no third-party host to vet, since we manage the property ourselves. Every booking is tied to a verified account, and guest reviews after each stay keep us accountable.",
  },
  {
    category: "Trust & Safety",
    question: "What if I need help during my stay?",
    answer:
      "Our support team is available around the clock from your account's Help Center. For anything you need on-site, contact details for local support are included in your check-in instructions.",
  },
];
