import { createClient } from "@sanity/client";
import imageUrlBuilder from "@sanity/image-url";
import { sanityConfig } from "./config";

export const sanityClient = createClient({
  ...sanityConfig,
  token: process.env.SANITY_API_TOKEN,
});

const builder = imageUrlBuilder(sanityClient);

export function urlFor(source: any) {
  return builder.image(source);
}
