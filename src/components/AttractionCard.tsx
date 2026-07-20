import React, { FC } from "react";
import Image from "next/image";
import { MapPinIcon } from "@heroicons/react/24/outline";
import Badge from "@/components/ui/Badge";
import type { Attraction } from "@/data/attractions";

export interface AttractionCardProps {
  className?: string;
  data: Attraction;
}

const AttractionCard: FC<AttractionCardProps> = ({ className = "", data }) => {
  const { title, category, description, imageUrl, distanceLabel, externalUrl } = data;

  return (
    <div
      className={`nc-AttractionCard group relative bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-2xl overflow-hidden hover:shadow-xl transition-shadow ${className}`}
      data-nc-id="AttractionCard"
    >
      <div className="relative w-full aspect-w-4 aspect-h-3">
        <Image
          src={imageUrl}
          alt={title}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <Badge name={category} color="gray" className="absolute left-3 top-3" />
      </div>

      <div className="p-4 space-y-2">
        <h3 className="font-semibold text-neutral-900 dark:text-white">
          <span className="line-clamp-1">{title}</span>
        </h3>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 line-clamp-2">{description}</p>
        <div className="flex items-center justify-between pt-1">
          <span className="flex items-center gap-1 text-sm text-neutral-500 dark:text-neutral-400">
            <MapPinIcon className="w-4 h-4" />
            {distanceLabel}
          </span>
          {externalUrl && (
            <a
              href={externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-primary-6000 hover:text-primary-700"
            >
              Learn more
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

export default AttractionCard;
