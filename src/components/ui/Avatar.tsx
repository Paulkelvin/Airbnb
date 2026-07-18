"use client";

import React, { FC } from "react";

const avatarColors = [
  "#ffdd00", "#fbb034", "#ff4c4c", "#c1d82f", "#f48924",
  "#7ac143", "#30c39e", "#06BCAE", "#0695BC", "#037ef3",
  "#146eb4", "#8e43e7", "#ea1d5d", "#fc636b", "#ff6f2c",
  "#ffc603", "#c0ca33", "#5e35b1",
];
import Image, { StaticImageData } from "next/image";
import { CheckIcon } from "@heroicons/react/24/solid";
import { cloudinaryLoader } from "@/lib/cloudinary-image-loader";

export interface AvatarProps {
  containerClassName?: string;
  sizeClass?: string;
  radius?: string;
  imgUrl?: string | StaticImageData;
  userName?: string;
  hasChecked?: boolean;
  hasCheckedClass?: string;
}

const Avatar: FC<AvatarProps> = ({
  containerClassName = "ring-1 ring-white dark:ring-neutral-900",
  sizeClass = "h-6 w-6 text-sm",
  radius = "rounded-full",
  imgUrl,
  userName,
  hasChecked,
  hasCheckedClass = "w-4 h-4 -top-0.5 -right-0.5",
}) => {
  const url = imgUrl || "";
  const name = userName || "John Doe";
  const _setBgColor = (name: string) => {
    const backgroundIndex = Math.floor(
      name.charCodeAt(0) % avatarColors.length
    );
    return avatarColors[backgroundIndex];
  };

  return (
    <div
      className={`wil-avatar relative flex-shrink-0 inline-flex items-center justify-center text-neutral-100 uppercase font-semibold shadow-inner ${radius} ${sizeClass} ${containerClassName}`}
      style={{ backgroundColor: url ? undefined : _setBgColor(name) }}
    >
      {url && (
        <Image
          className={`absolute inset-0 w-full h-full object-cover ${radius}`}
          src={url}
          loader={cloudinaryLoader}
          alt={name}
          fill
        />
      )}
      <span className="wil-avatar__name">{name[0]}</span>

      {hasChecked && (
        <span
          className={` bg-teal-500 rounded-full text-white text-xs flex items-center justify-center absolute  ${hasCheckedClass}`}
        >
          <CheckIcon className="w-2/3 h-2/3" />
        </span>
      )}
    </div>
  );
};

export default Avatar;
