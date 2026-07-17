const page = {
  name: "page",
  title: "Page",
  type: "document",
  fields: [
    {
      name: "title",
      title: "Title",
      type: "string",
      validation: (Rule: any) => Rule.required(),
    },
    {
      name: "slug",
      title: "Slug",
      type: "slug",
      options: { source: "title", maxLength: 96 },
      description: "URL path for this page (e.g. 'about', 'faq', 'terms').",
      validation: (Rule: any) => Rule.required(),
    },
    {
      name: "body",
      title: "Body",
      type: "blockContent",
    },
    {
      name: "seo",
      title: "SEO",
      type: "object",
      options: { collapsible: true, collapsed: true },
      fields: [
        {
          name: "metaTitle",
          title: "Meta Title",
          type: "string",
          validation: (Rule: any) => Rule.max(60),
        },
        {
          name: "metaDescription",
          title: "Meta Description",
          type: "text",
          rows: 2,
          validation: (Rule: any) => Rule.max(160),
        },
        {
          name: "ogImage",
          title: "Social Share Image",
          type: "image",
        },
      ],
    },
  ],
  preview: {
    select: { title: "title", slug: "slug.current" },
    prepare({ title, slug }: any) {
      return { title, subtitle: `/${slug ?? ""}` };
    },
  },
};

export { page };
