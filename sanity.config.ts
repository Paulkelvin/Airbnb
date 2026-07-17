// @ts-nocheck
import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { visionTool } from "@sanity/vision";
import { schemaTypes } from "@/lib/sanity/schemas";
import { sanityConfig } from "@/lib/sanity/config";

export default defineConfig({
  name: "potomac-cms",
  title: "Potomac CMS",
  ...sanityConfig,
  basePath: "/studio",
  plugins: [structureTool(), visionTool()],
  schema: { types: schemaTypes },
});
