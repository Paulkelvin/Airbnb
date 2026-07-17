"use client";

// @ts-expect-error -- next-sanity/studio types lag behind the runtime
import { NextStudio } from "next-sanity/studio";
import config from "../../../../sanity.config";

export default function StudioPage() {
  return <NextStudio config={config} />;
}
