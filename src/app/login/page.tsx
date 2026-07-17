"use client";

import React, { useState, useTransition } from "react";
import { signIn, getSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Input from "@/components/ui/Input";
import PasswordInput from "@/components/ui/PasswordInput";
import ButtonPrimary from "@/components/ui/ButtonPrimary";
import Link from "next/link";
import { getDefaultDashboardPath } from "@/lib/dashboard-path";

const PageLogin = () => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await signIn("credentials", {
        email: formData.get("email"),
        password: formData.get("password"),
        redirect: false,
      });

      if (result?.error) {
        setError(
          result.error === "RATE_LIMITED"
            ? "Too many login attempts. Please try again in a few minutes."
            : "Invalid email or password",
        );
        return;
      }

      const session = await getSession();
      router.push(getDefaultDashboardPath(session?.user.roles ?? ["CUSTOMER"]));
      router.refresh();
    });
  }

  return (
    <div className={`nc-PageLogin`}>
      <div className="container mb-24 lg:mb-32">
        <h2 className="my-20 flex items-center text-3xl leading-[115%] md:text-5xl md:leading-[115%] font-semibold text-neutral-900 dark:text-neutral-100 justify-center">
          Welcome back
        </h2>
        <div className="max-w-md mx-auto space-y-6">
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
            <label className="block">
              <span className="text-neutral-800 dark:text-neutral-200">Password</span>
              <PasswordInput name="password" required className="mt-1" />
              <Link href="/forgot-password" className="text-sm underline mt-1 inline-block">
                Forgot password?
              </Link>
            </label>
            <ButtonPrimary type="submit" loading={isPending} disabled={isPending}>
              Log in
            </ButtonPrimary>
          </form>

          <span className="block text-center text-neutral-700 dark:text-neutral-300">
            New user?{` `}
            <Link href="/signup" className="font-semibold underline">
              Create an account
            </Link>
          </span>
        </div>
      </div>
    </div>
  );
};

export default PageLogin;
