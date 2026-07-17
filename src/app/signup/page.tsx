"use client";

import React, { useState, useTransition } from "react";
import { signIn, getSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Input from "@/components/ui/Input";
import PasswordInput from "@/components/ui/PasswordInput";
import ButtonPrimary from "@/components/ui/ButtonPrimary";
import Link from "next/link";
import { register } from "@/actions/auth";
import { getDefaultDashboardPath } from "@/lib/dashboard-path";

const PageSignUp = () => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[] | undefined>>();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setFieldErrors(undefined);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await register(formData);
      if (!result.success) {
        setError(result.error.message);
        setFieldErrors(result.error.fieldErrors);
        return;
      }

      const signInResult = await signIn("credentials", {
        email: formData.get("email"),
        password: formData.get("password"),
        redirect: false,
      });

      if (signInResult?.error) {
        setError("Account created — please sign in.");
        router.push("/login");
        return;
      }

      const session = await getSession();
      router.push(getDefaultDashboardPath(session?.user.roles ?? ["CUSTOMER"]));
      router.refresh();
    });
  }

  return (
    <div className={`nc-PageSignUp`}>
      <div className="container mb-24 lg:mb-32">
        <h2 className="my-20 flex items-center text-3xl leading-[115%] md:text-5xl md:leading-[115%] font-semibold text-neutral-900 dark:text-neutral-100 justify-center">
          Create your account
        </h2>
        <div className="max-w-md mx-auto space-y-6">
          {error && (
            <div className="rounded-lg bg-red-50 text-red-700 text-sm px-4 py-3">{error}</div>
          )}
          <form className="grid grid-cols-1 gap-6" onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-4">
              <label className="block">
                <span className="text-neutral-800 dark:text-neutral-200">First name</span>
                <Input name="firstName" placeholder="First name" required className="mt-1" />
                {fieldErrors?.firstName && (
                  <span className="text-xs text-red-600">{fieldErrors.firstName[0]}</span>
                )}
              </label>
              <label className="block">
                <span className="text-neutral-800 dark:text-neutral-200">Last name</span>
                <Input name="lastName" placeholder="Last name" required className="mt-1" />
                {fieldErrors?.lastName && (
                  <span className="text-xs text-red-600">{fieldErrors.lastName[0]}</span>
                )}
              </label>
            </div>
            <label className="block">
              <span className="text-neutral-800 dark:text-neutral-200">Email address</span>
              <Input
                name="email"
                type="email"
                placeholder="example@example.com"
                required
                className="mt-1"
              />
              {fieldErrors?.email && (
                <span className="text-xs text-red-600">{fieldErrors.email[0]}</span>
              )}
            </label>
            <label className="block">
              <span className="text-neutral-800 dark:text-neutral-200">Password</span>
              <PasswordInput name="password" placeholder="Create a password" required className="mt-1" />
              {fieldErrors?.password && (
                <span className="text-xs text-red-600">{fieldErrors.password[0]}</span>
              )}
            </label>
            <label className="block">
              <span className="text-neutral-800 dark:text-neutral-200">Confirm password</span>
              <PasswordInput name="confirmPassword" placeholder="Confirm your password" required className="mt-1" />
              {fieldErrors?.confirmPassword && (
                <span className="text-xs text-red-600">{fieldErrors.confirmPassword[0]}</span>
              )}
            </label>
            <ButtonPrimary type="submit" loading={isPending} disabled={isPending}>
              Create account
            </ButtonPrimary>
          </form>

          <span className="block text-center text-neutral-700 dark:text-neutral-300">
            Already have an account?{` `}
            <Link href="/login" className="font-semibold underline">
              Sign in
            </Link>
          </span>
        </div>
      </div>
    </div>
  );
};

export default PageSignUp;
