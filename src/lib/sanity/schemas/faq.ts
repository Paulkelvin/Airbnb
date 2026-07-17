const faq = {
  name: "faq",
  title: "FAQ",
  type: "document",
  fields: [
    {
      name: "question",
      title: "Question",
      type: "string",
      validation: (Rule: any) => Rule.required(),
    },
    {
      name: "answer",
      title: "Answer",
      type: "text",
      rows: 4,
      validation: (Rule: any) => Rule.required(),
    },
    {
      name: "category",
      title: "Category",
      type: "string",
      description: "Groups related questions together on the Help Centre page (e.g. Booking, Payments, Hosting).",
      validation: (Rule: any) => Rule.required(),
    },
    {
      name: "order",
      title: "Order",
      type: "number",
      description: "Lower numbers appear first within a category.",
      initialValue: 0,
    },
  ],
  orderings: [
    {
      title: "Category, then Order",
      name: "categoryOrder",
      by: [
        { field: "category", direction: "asc" },
        { field: "order", direction: "asc" },
      ],
    },
  ],
  preview: {
    select: { title: "question", subtitle: "category" },
  },
};

export { faq };
