"use client";

import React, { useState, useTransition } from "react";
import { signIn, getSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Input from "@/components/ui/Input";
import PasswordInput from "@/components/ui/PasswordInput";
import ButtonPrimary from "@/components/ui/ButtonPrimary";
import Link from "next/link";
import { getDefaultDashboardPath } from "@/lib/dashboard-path";
import type { Route } from "@/routers/types";

const PageLogin = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl");
  const safeCallbackUrl =
    callbackUrl && callbackUrl.startsWith("/") && !callbackUrl.startsWith("//")
      ? callbackUrl
      : null;
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

      if (safeCallbackUrl) {
        router.push(safeCallbackUrl as Route);
      } else {
        const session = await getSession();
        router.push(getDefaultDashboardPath(session?.user.roles ?? ["CUSTOMER"]));
      }
      router.refresh();
    });
  }

  return (
    <div className="nc-PageLogin min-h-screen flex">
      {/* Left branding panel - hidden on mobile */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-primary-6000 via-primary-700 to-primary-800 items-center justify-center">
        {/* Decorative pattern overlay */}
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="login-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <circle cx="20" cy="20" r="1.5" fill="white" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#login-grid)" />
          </svg>
        </div>
        {/* Decorative floating shapes */}
        <div className="absolute top-20 left-16 w-64 h-64 rounded-full bg-white/5 blur-2xl" />
        <div className="absolute bottom-32 right-20 w-48 h-48 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute top-1/3 right-16 w-32 h-32 rounded-full border border-white/20" />

        <div className="relative z-10 max-w-md px-8 text-center">
          {/* Logo / brand mark */}
          <div className="mx-auto mb-8 w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg">
            <svg className="w-10 h-10 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-white mb-4">
            Welcome back
          </h2>
          <p className="text-white/70 text-lg leading-relaxed">
            Sign in to access your bookings, saved listings, and personalized recommendations.
          </p>
        </div>
      </div>

      {/* Right form panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-6 py-12 bg-neutral-50 dark:bg-neutral-900">
        <div className="w-full max-w-md">
          {/* Mobile heading - visible only on small screens */}
          <h1 className="lg:hidden text-3xl font-bold text-neutral-900 dark:text-neutral-100 text-center mb-8">
            Welcome back
          </h1>

          {/* Form card */}
          <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-xl dark:shadow-2xl dark:shadow-black/20 p-8 sm:p-10">
            <h2 className="hidden lg:block text-2xl font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
              Sign in to your account
            </h2>
            <p className="hidden lg:block text-neutral-500 dark:text-neutral-400 mb-8">
              Enter your credentials below to continue
            </p>

            {error && (
              <div className="rounded-lg bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 text-sm px-4 py-3 mb-6">
                {error}
              </div>
            )}

            <form className="grid grid-cols-1 gap-6" onSubmit={handleSubmit}>
              <label className="block">
                <span className="text-neutral-800 dark:text-neutral-200 text-sm font-medium">
                  Email address
                </span>
                <Input
                  name="email"
                  type="email"
                  placeholder="example@example.com"
                  required
                  className="mt-1.5"
                />
              </label>
              <label className="block">
                <span className="text-neutral-800 dark:text-neutral-200 text-sm font-medium">
                  Password
                </span>
                <PasswordInput name="password" required className="mt-1.5" />
                <Link
                  href="/forgot-password"
                  className="text-sm text-primary-6000 hover:text-primary-700 dark:hover:text-primary-500 mt-2 inline-block font-medium"
                >
                  Forgot password?
                </Link>
              </label>
              <ButtonPrimary type="submit" loading={isPending} disabled={isPending} className="w-full py-3">
                Log in
              </ButtonPrimary>
            </form>
          </div>

          <p className="text-center text-neutral-600 dark:text-neutral-400 mt-8 text-sm">
            New user?{" "}
            <Link href="/signup" className="font-semibold text-primary-6000 hover:text-primary-700 dark:hover:text-primary-500">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default PageLogin;
