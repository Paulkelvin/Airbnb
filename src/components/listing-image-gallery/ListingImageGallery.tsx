"use client";

import "./styles/index.css";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FC, Fragment, useEffect, useMemo, useRef, useState } from "react";
import Modal from "./components/Modal";
import type { ListingGalleryImage } from "./utils/types";
import { useLastViewedPhoto } from "./utils/useLastViewedPhoto";
import { ArrowSmallLeftIcon } from "@heroicons/react/24/outline";
import { Dialog, Transition } from "@headlessui/react";
import { Route } from "next";

const PHOTOS: string[] = [
  "https://images.pexels.com/photos/6129967/pexels-photo-6129967.jpeg?auto=compress&cs=tinysrgb&dpr=3&h=750&w=1260",
  "https://images.pexels.com/photos/7163619/pexels-photo-7163619.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=750&w=1260",
  "https://images.pexels.com/photos/6527036/pexels-photo-6527036.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=750&w=1260",
  "https://images.pexels.com/photos/6969831/pexels-photo-6969831.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=750&w=1260",
  "https://images.pexels.com/photos/6438752/pexels-photo-6438752.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=750&w=1260",
  "https://images.pexels.com/photos/1320686/pexels-photo-1320686.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=750&w=1260",
  "https://images.pexels.com/photos/261394/pexels-photo-261394.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=750&w=1260",
  "https://images.pexels.com/photos/2861361/pexels-photo-2861361.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=750&w=1260",
];

export const DEMO_IMAGE: ListingGalleryImage[] = [...PHOTOS].map(
  (item, index): ListingGalleryImage => {
    return {
      id: index,
      url: item,
    };
  }
);

export const getNewParam = ({
  paramName = "photoId",
  value,
}: {
  paramName?: string;
  value: string | number;
}) => {
  let params = new URLSearchParams(document.location.search);
  params.set(paramName, String(value));
  return params.toString();
};

interface Props {
  images?: ListingGalleryImage[];
  onClose?: () => void;
  isShowModal: boolean;
}

const ListingImageGallery: FC<Props> = ({
  images = DEMO_IMAGE,
  onClose,
  isShowModal,
}) => {
  const searchParams = useSearchParams();
  const photoId = searchParams?.get("photoId");
  const router = useRouter();
  const [lastViewedPhoto, setLastViewedPhoto] = useLastViewedPhoto();
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const categories = useMemo(() => {
    const seen = new Set<string>();
    for (const img of images) {
      if (img.category) seen.add(img.category);
    }
    return Array.from(seen);
  }, [images]);

  const visibleImages = activeCategory
    ? images.filter((img) => img.category === activeCategory)
    : images;

  const lastViewedPhotoRef = useRef<HTMLDivElement>(null);
  const thisPathname = usePathname();
  useEffect(() => {
    // This effect keeps track of the last viewed photo in the modal to keep the index page in sync when the user navigates back
    if (lastViewedPhoto && !photoId) {
      lastViewedPhotoRef.current?.scrollIntoView({ block: "center" });
      setLastViewedPhoto(null);
    }
  }, [photoId, lastViewedPhoto, setLastViewedPhoto]);

  const handleClose = () => {
    onClose && onClose();
  };

  const renderContent = () => {
    return (
      <div className=" ">
        {photoId && (
          <Modal
            images={images}
            onClose={() => {
              // @ts-ignore
              setLastViewedPhoto(photoId);
              let params = new URLSearchParams(document.location.search);
              params.delete("photoId");
              router.push(`${thisPathname}/?${params.toString()}` as Route);
            }}
          />
        )}

        {categories.length > 1 && (
          <div className="flex flex-wrap gap-2 mb-6">
            <button
              type="button"
              onClick={() => setActiveCategory(null)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                activeCategory === null
                  ? "bg-neutral-900 text-white border-neutral-900 dark:bg-white dark:text-neutral-900"
                  : "border-neutral-300 text-neutral-600 hover:bg-neutral-100 dark:border-neutral-600 dark:text-neutral-300 dark:hover:bg-neutral-800"
              }`}
            >
              All ({images.length})
            </button>
            {categories.map((cat) => {
              const count = images.filter((img) => img.category === cat).length;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                    activeCategory === cat
                      ? "bg-neutral-900 text-white border-neutral-900 dark:bg-white dark:text-neutral-900"
                      : "border-neutral-300 text-neutral-600 hover:bg-neutral-100 dark:border-neutral-600 dark:text-neutral-300 dark:hover:bg-neutral-800"
                  }`}
                >
                  {cat} ({count})
                </button>
              );
            })}
          </div>
        )}

        <div className="columns-1 gap-4 sm:columns-2 xl:columns-3">
          {visibleImages.map(({ id, url }) => (
            <div
              key={id}
              onClick={() => {
                const newPathname = getNewParam({ value: id });
                router.push(`${thisPathname}/?${newPathname}` as Route);
              }}
              ref={id === Number(lastViewedPhoto) ? lastViewedPhotoRef : null}
              className="after:content group relative mb-5 block w-full cursor-zoom-in after:pointer-events-none after:absolute after:inset-0 after:rounded-lg after:shadow-highlight focus:outline-none"
            >
              <Image
                alt="listing gallery "
                className="transform rounded-lg brightness-90 transition will-change-auto group-hover:brightness-110 focus:outline-none"
                style={{
                  transform: "translate3d(0, 0, 0)",
                }}
                src={url}
                width={720}
                height={480}
                sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 350px"
              />
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <>
      <Transition appear show={isShowModal} as={Fragment}>
        <Dialog as="div" className="relative z-40" onClose={handleClose}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-white" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="sticky z-10 top-0 p-4 xl:px-10 flex items-center bg-white">
              <button
                className="focus:outline-none focus:ring-0 w-10 h-10 rounded-full flex items-center justify-center hover:bg-neutral-100"
                onClick={handleClose}
              >
                <ArrowSmallLeftIcon className="w-6 h-6" />
              </button>
            </div>

            <div className="flex min-h-full items-center justify-center sm:p-4 pt-0 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 translate-y-5"
                enterTo="opacity-100 translate-y-0"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 translate-y-0"
                leaveTo="opacity-0 translate-y-5"
              >
                <Dialog.Panel className="w-full max-w-screen-lg mx-auto transform p-4 pt-0 text-left transition-all ">
                  {renderContent()}
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </>
  );
};

export default ListingImageGallery;
