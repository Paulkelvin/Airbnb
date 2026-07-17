"use client";

import React, { useEffect } from "react";
import ButtonPrimary from "@/components/ui/ButtonPrimary";
import ButtonSecondary from "@/components/ui/ButtonSecondary";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="container flex flex-col items-center justify-center text-center py-24 lg:py-32 space-y-5">
      <h1 className="text-2xl md:text-3xl font-semibold text-neutral-900 dark:text-neutral-100">
        Something went wrong
      </h1>
      <p className="max-w-md text-neutral-500 dark:text-neutral-400">
        We hit an unexpected error loading this page. You can try again, or head back to the
        homepage.
      </p>
      <div className="flex gap-3 pt-2">
        <ButtonSecondary onClick={() => reset()}>Try again</ButtonSecondary>
        <ButtonPrimary href="/">Go to homepage</ButtonPrimary>
      </div>
    </div>
  );
}
