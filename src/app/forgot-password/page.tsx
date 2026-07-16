"use client";

import React, { useState, useTransition } from "react";
import Input from "@/components/ui/Input";
import ButtonPrimary from "@/components/ui/ButtonPrimary";
import Link from "next/link";
import { forgotPassword } from "@/actions/auth";

const PageForgotPassword = () => {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await forgotPassword(formData);
      if (!result.success) {
        setError(result.error.message);
        return;
      }
      setSubmitted(true);
    });
  }

  return (
    <div className="nc-PageForgotPassword">
      <div className="container mb-24 lg:mb-32">
        <h2 className="my-20 flex items-center text-3xl leading-[115%] md:text-5xl md:leading-[115%] font-semibold text-neutral-900 dark:text-neutral-100 justify-center">
          Forgot password
        </h2>
        <div className="max-w-md mx-auto space-y-6">
          {submitted ? (
            <div className="rounded-lg bg-green-50 text-green-700 text-sm px-4 py-3">
              If an account exists with that email, a reset link has been sent. Check your inbox.
            </div>
          ) : (
            <>
              <p className="text-center text-neutral-600 dark:text-neutral-400">
                Enter the email address associated with your account and we&apos;ll send you a link to reset
                your password.
              </p>
              {error && (
                <div className="rounded-lg bg-red-50 text-red-700 text-sm px-4 py-3">{error}</div>
              )}
              <form className="grid grid-cols-1 gap-6" onSubmit={handleSubmit}>
                <label className="block">
                  <span className="text-neutral-800 dark:text-neutral-200">Email address</span>
                  <Input
                    name="email"
                    type="email"
                    placeholder="example@example.com"
                    required
                    className="mt-1"
                  />
                </label>
                <ButtonPrimary type="submit" loading={isPending} disabled={isPending}>
                  Send reset link
                </ButtonPrimary>
              </form>
            </>
          )}

          <span className="block text-center text-neutral-700 dark:text-neutral-300">
            Remembered your password?{` `}
            <Link href="/login" className="font-semibold underline">
              Log in
            </Link>
          </span>
        </div>
      </div>
    </div>
  );
};

export default PageForgotPassword;
