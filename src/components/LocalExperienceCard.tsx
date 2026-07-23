import React, { FC } from "react";
import Image from "next/image";
import Link from "next/link";
import { MapPinIcon, PhotoIcon } from "@heroicons/react/24/outline";
import Badge from "@/components/ui/Badge";
import { CATEGORY_EMOJI, type LocalExperience } from "@/data/local-experiences";
import type { Route } from "@/routers/types";

export interface LocalExperienceCardProps {
  className?: string;
  data: LocalExperience;
}

const LocalExperienceCard: FC<LocalExperienceCardProps> = ({ className = "", data }) => {
  const { slug, title, category, tagline, imageUrl, distanceLabel } = data;
  const href = `/explore-the-area/${slug}` as Route;

  return (
    <Link
      href={href}
      className={`nc-LocalExperienceCard group relative flex flex-col bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-2xl overflow-hidden hover:shadow-xl transition-shadow ${className}`}
      data-nc-id="LocalExperienceCard"
    >
      <div className="relative w-full">
        <div className="relative w-full aspect-w-4 aspect-h-3">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={title}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            // No verified photo of this place yet — a muted placeholder
            // rather than passing an empty src to next/image (which
            // renders a broken image box instead of hiding gracefully).
            <div className="absolute inset-0 flex items-center justify-center bg-neutral-100 dark:bg-neutral-800">
              <PhotoIcon className="w-8 h-8 text-neutral-300 dark:text-neutral-600" />
            </div>
          )}
        </div>
        <Badge
          name={`${CATEGORY_EMOJI[category] ?? ""} ${category}`.trim()}
          color="gray"
          className="absolute left-3 top-3"
        />
      </div>

      <div className="p-4 space-y-2 flex-1 flex flex-col">
        <h3 className="font-semibold text-neutral-900 dark:text-white">
          <span className="line-clamp-1">{title}</span>
        </h3>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 line-clamp-2 flex-1">{tagline}</p>
        <span className="flex items-center gap-1 text-sm text-primary-6000 font-medium pt-1">
          <MapPinIcon className="w-4 h-4" />
          {distanceLabel} from Potomac Vista Cottage
        </span>
      </div>
    </Link>
  );
};

export default LocalExperienceCard;
