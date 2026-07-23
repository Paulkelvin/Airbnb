"use client";

import Image from "next/image";
import { cloudinaryLoader } from "@/lib/cloudinary-image-loader";

interface BedroomPhoto {
  label: string;
  bedConfig: string;
  imageUrl: string;
}

/**
 * Groups the "Bedroom"-category images into one card per real bedroom, using
 * the filename convention (master-bedroom-*, second-bedroom-*) rather than a
 * dedicated DB field — this is a single, fixed 2-bedroom property, not a
 * marketplace listing whose room count changes, so a real "which bedroom"
 * column would be more machinery than the fact warrants.
 */
function getBedroomPhotos(images: { url: string; category: string | null }[]): BedroomPhoto[] {
  const bedroomImages = images.filter((img) => img.category === "Bedroom");
  const master = bedroomImages.find((img) => img.url.includes("master-bedroom"));
  const second = bedroomImages.find((img) => img.url.includes("second-bedroom-trundle"));

  const photos: BedroomPhoto[] = [];
  if (master) photos.push({ label: "Bedroom 1", bedConfig: "1 queen bed", imageUrl: master.url });
  if (second) {
    photos.push({ label: "Bedroom 2", bedConfig: "1 double bed, 1 air mattress", imageUrl: second.url });
  }
  return photos;
}

export default function WhereYouSleep({
  images,
}: {
  images: { url: string; category: string | null }[];
}) {
  const bedrooms = getBedroomPhotos(images);
  if (bedrooms.length === 0) return null;

  return (
    <div className="listingSection__wrap">
      <h2 className="text-2xl font-semibold">Where you&apos;ll sleep</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {bedrooms.map((bedroom) => (
          <div key={bedroom.label} className="space-y-2.5">
            <div className="relative aspect-[4/3] rounded-xl overflow-hidden">
              <Image
                loader={cloudinaryLoader}
                src={bedroom.imageUrl}
                alt={bedroom.label}
                fill
                sizes="(max-width: 640px) 100vw, 50vw"
                className="object-cover"
              />
            </div>
            <div>
              <p className="font-medium text-neutral-900 dark:text-neutral-100">{bedroom.label}</p>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">{bedroom.bedConfig}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
