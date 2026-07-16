"use client";

import React, { Suspense, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Input from "@/components/ui/Input";
import PasswordInput from "@/components/ui/PasswordInput";
import ButtonPrimary from "@/components/ui/ButtonPrimary";
import Link from "next/link";
import { resetPassword } from "@/actions/auth";

const ResetPasswordForm = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams?.get("token") ?? "";
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[] | undefined>>();
  const [success, setSuccess] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setFieldErrors(undefined);
    const formData = new FormData(e.currentTarget);
    formData.set("token", token);

    startTransition(async () => {
      const result = await resetPassword(formData);
      if (!result.success) {
        setError(result.error.message);
        setFieldErrors(result.error.fieldErrors);
        return;
      }
      setSuccess(true);
      setTimeout(() => router.push("/login"), 2000);
    });
  }

  if (!token) {
    return (
      <div className="nc-PageResetPassword">
        <div className="container mb-24 lg:mb-32">
          <h2 className="my-20 flex items-center text-3xl leading-[115%] md:text-5xl md:leading-[115%] font-semibold text-neutral-900 dark:text-neutral-100 justify-center">
            Reset password
          </h2>
          <div className="max-w-md mx-auto space-y-6">
            <div className="rounded-lg bg-red-50 text-red-700 text-sm px-4 py-3">
              This reset link is missing its token. Please use the link from your email, or request a new
              one.
            </div>
            <span className="block text-center text-neutral-700 dark:text-neutral-300">
              <Link href="/forgot-password" className="font-semibold underline">
                Request a new reset link
              </Link>
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="nc-PageResetPassword">
      <div className="container mb-24 lg:mb-32">
        <h2 className="my-20 flex items-center text-3xl leading-[115%] md:text-5xl md:leading-[115%] font-semibold text-neutral-900 dark:text-neutral-100 justify-center">
          Reset password
        </h2>
        <div className="max-w-md mx-auto space-y-6">
          {success ? (
            <div className="rounded-lg bg-green-50 text-green-700 text-sm px-4 py-3">
              Password reset successfully. Redirecting you to log in&hellip;
            </div>
          ) : (
            <>
              {error && (
                <div className="rounded-lg bg-red-50 text-red-700 text-sm px-4 py-3">{error}</div>
              )}
              <form className="grid grid-cols-1 gap-6" onSubmit={handleSubmit}>
                <label className="block">
                  <span className="text-neutral-800 dark:text-neutral-200">New password</span>
                  <PasswordInput name="password" required className="mt-1" />
                  {fieldErrors?.password && (
                    <span className="text-xs text-red-600">{fieldErrors.password[0]}</span>
                  )}
                </label>
                <label className="block">
                  <span className="text-neutral-800 dark:text-neutral-200">Confirm new password</span>
                  <PasswordInput name="confirmPassword" required className="mt-1" />
                  {fieldErrors?.confirmPassword && (
                    <span className="text-xs text-red-600">{fieldErrors.confirmPassword[0]}</span>
                  )}
                </label>
                <ButtonPrimary type="submit" loading={isPending} disabled={isPending}>
                  Reset password
                </ButtonPrimary>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const PageResetPassword = () => (
  <Suspense fallback={null}>
    <ResetPasswordForm />
  </Suspense>
);

export default PageResetPassword;
