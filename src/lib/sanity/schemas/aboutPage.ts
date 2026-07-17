/**
 * Singleton — exactly one "aboutPage" document should ever exist (enforced
 * by the admin CMS's actions using a fixed document id, not by Sanity
 * itself). Structured rather than a single blockContent body so the About
 * page's distinct sections (stats grid, values grid) stay editable without
 * losing that layout.
 */
const aboutPage = {
  name: "aboutPage",
  title: "About Page",
  type: "document",
  fields: [
    { name: "heroTitle", title: "Hero Title", type: "string", validation: (Rule: any) => Rule.required() },
    { name: "heroSubtitle", title: "Hero Subtitle", type: "string" },
    { name: "heroBody", title: "Hero Body", type: "blockContent" },
    {
      name: "stats",
      title: "Stats",
      type: "array",
      of: [
        {
          type: "object",
          name: "stat",
          fields: [
            { name: "label", title: "Label", type: "string" },
            { name: "value", title: "Value", type: "string" },
          ],
        },
      ],
    },
    { name: "missionTitle", title: "Mission Title", type: "string" },
    { name: "missionBody", title: "Mission Body", type: "blockContent" },
    { name: "missionImage", title: "Mission Image", type: "image", options: { hotspot: true } },
    { name: "valuesTitle", title: "Values Section Title", type: "string" },
    { name: "valuesSubtitle", title: "Values Section Subtitle", type: "string" },
    {
      name: "values",
      title: "Values",
      type: "array",
      of: [
        {
          type: "object",
          name: "value",
          fields: [
            { name: "title", title: "Title", type: "string" },
            { name: "description", title: "Description", type: "text", rows: 2 },
          ],
        },
      ],
    },
    { name: "ctaTitle", title: "Call-to-Action Title", type: "string" },
    { name: "ctaSubtitle", title: "Call-to-Action Subtitle", type: "string" },
  ],
  preview: {
    select: { title: "heroTitle" },
  },
};

export { aboutPage };
