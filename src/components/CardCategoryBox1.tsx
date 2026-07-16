import React, { FC } from "react";
import { TaxonomyType } from "@/data/types";
import convertNumbThousand from "@/utils/convertNumbThousand";
import Link from "next/link";
import Image from "next/image";

export interface CardCategoryBox1Props {
  className?: string;
  taxonomy: TaxonomyType;
}

const CardCategoryBox1: FC<CardCategoryBox1Props> = ({
  className = "",
  taxonomy,
}) => {
  const { count, name, thumbnail, href = "/" } = taxonomy;
  return (
    <Link
      href={href}
      className={`nc-CardCategoryBox1 group relative flex flex-col ${className}`}
    >
      <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden">
        <Image
          src={thumbnail || ""}
          fill
          alt={name}
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
        />
      </div>
      <div className="mt-3">
        <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
          <span className="line-clamp-1">{name}</span>
        </h2>
        <span className="block mt-0.5 text-sm text-neutral-500 dark:text-neutral-400">
          {convertNumbThousand(count)} properties
        </span>
      </div>
    </Link>
  );
};

export default CardCategoryBox1;
