const post = {
  name: "post",
  title: "Blog Post",
  type: "document",
  fields: [
    {
      name: "title",
      title: "Title",
      type: "string",
      validation: (Rule: any) => Rule.required().max(120),
    },
    {
      name: "slug",
      title: "Slug",
      type: "slug",
      options: { source: "title", maxLength: 96 },
      validation: (Rule: any) => Rule.required(),
    },
    {
      name: "author",
      title: "Author",
      type: "reference",
      to: [{ type: "author" }],
    },
    {
      name: "mainImage",
      title: "Main Image",
      type: "image",
      options: { hotspot: true },
      fields: [
        {
          name: "alt",
          title: "Alt Text",
          type: "string",
          description: "Describe the image for accessibility and SEO.",
        },
      ],
    },
    {
      name: "categories",
      title: "Categories",
      type: "array",
      of: [{ type: "reference", to: [{ type: "category" }] }],
    },
    {
      name: "publishedAt",
      title: "Published At",
      type: "datetime",
      initialValue: () => new Date().toISOString(),
    },
    {
      name: "excerpt",
      title: "Excerpt",
      type: "text",
      rows: 3,
      description: "Short summary shown on the blog listing page and in search results.",
      validation: (Rule: any) => Rule.max(300),
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
          description: "Override the page title for search engines (max 60 chars).",
          validation: (Rule: any) => Rule.max(60),
        },
        {
          name: "metaDescription",
          title: "Meta Description",
          type: "text",
          rows: 2,
          description: "Page description for search engines (max 160 chars).",
          validation: (Rule: any) => Rule.max(160),
        },
        {
          name: "ogImage",
          title: "Social Share Image",
          type: "image",
          description: "Image shown when the post is shared on social media. Falls back to the main image.",
        },
      ],
    },
  ],
  orderings: [
    {
      title: "Published Date, New",
      name: "publishedAtDesc",
      by: [{ field: "publishedAt", direction: "desc" }],
    },
  ],
  preview: {
    select: {
      title: "title",
      author: "author.name",
      media: "mainImage",
      date: "publishedAt",
    },
    prepare({ title, author, media, date }: any) {
      const d = date ? new Date(date).toLocaleDateString() : "Draft";
      return { title, subtitle: `${author ?? "No author"} — ${d}`, media };
    },
  },
};

export { post };
