"use client";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error -- next-sanity/studio's declared peer range (sanity ^5||^6)
// is ahead of the React-18-compatible sanity@4.x this project pins; the
// wrapper itself only touches sanity's stable Studio/history props.
import { NextStudio } from "next-sanity/studio";
import config from "../../../../sanity.config";

export default function StudioPage() {
  return <NextStudio config={config} />;
}
