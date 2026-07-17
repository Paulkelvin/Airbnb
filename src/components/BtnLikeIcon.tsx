"use client";

import React, { FC, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toggleFavorite } from "@/modules/favorites/actions";

export interface BtnLikeIconProps {
  className?: string;
  colorClass?: string;
  isLiked?: boolean;
  listingId: string;
}

const BtnLikeIcon: FC<BtnLikeIconProps> = ({
  className = "",
  colorClass = "text-white bg-black bg-opacity-30 hover:bg-opacity-50",
  isLiked = false,
  listingId,
}) => {
  const [likedState, setLikedState] = useState(isLiked);
  const { status } = useSession();
  const router = useRouter();

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (status !== "authenticated") {
      router.push("/login");
      return;
    }

    setLikedState(!likedState);
    const result = await toggleFavorite(listingId);
    if (result.success) {
      setLikedState(result.data.favorited);
    } else {
      setLikedState(likedState);
    }
  };

  return (
    <button
      type="button"
      className={`nc-BtnLikeIcon w-8 h-8 flex items-center justify-center rounded-full cursor-pointer ${
        likedState ? "nc-BtnLikeIcon--liked" : ""
      }  ${colorClass} ${className}`}
      data-nc-id="BtnLikeIcon"
      aria-label={likedState ? "Remove from wishlist" : "Save to wishlist"}
      onClick={handleClick}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className={`h-5 w-5 transition-colors duration-200 ${
          likedState ? "text-rose-600" : ""
        }`}
        fill={likedState ? "currentColor" : "none"}
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
        />
      </svg>
    </button>
  );
};

export default BtnLikeIcon;
