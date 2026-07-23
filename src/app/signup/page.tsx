"use client";

import React, { useState, useTransition, useMemo } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Input from "@/components/ui/Input";
import PasswordInput from "@/components/ui/PasswordInput";
import ButtonPrimary from "@/components/ui/ButtonPrimary";
import Link from "next/link";
import { register } from "@/actions/auth";
import type { Route } from "@/routers/types";

function getPasswordStrength(password: string): {
  score: number;
  label: string;
  color: string;
  bgColor: string;
} {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { score, label: "Weak", color: "bg-red-500", bgColor: "bg-red-100 dark:bg-red-900/30" };
  if (score <= 2) return { score, label: "Fair", color: "bg-orange-500", bgColor: "bg-orange-100 dark:bg-orange-900/30" };
  if (score <= 3) return { score, label: "Good", color: "bg-yellow-500", bgColor: "bg-yellow-100 dark:bg-yellow-900/30" };
  return { score, label: "Strong", color: "bg-green-500", bgColor: "bg-green-100 dark:bg-green-900/30" };
}

const PageSignUp = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl");
  const safeCallbackUrl =
    callbackUrl && callbackUrl.startsWith("/") && !callbackUrl.startsWith("//")
      ? callbackUrl
      : null;
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[] | undefined>>();
  const [password, setPassword] = useState("");

  const strength = useMemo(() => getPasswordStrength(password), [password]);

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

      router.push((safeCallbackUrl ?? "/") as Route);
      router.refresh();
    });
  }

  return (
    <div className={`nc-PageSignUp`}>
      <div className="container mb-24 lg:mb-32">
        <h1 className="my-20 flex items-center text-3xl leading-[115%] md:text-5xl md:leading-[115%] font-semibold text-neutral-900 dark:text-neutral-100 justify-center">
          Create your account
        </h1>
        <div className="max-w-md mx-auto space-y-6">
          {error && (
            <div className="rounded-lg bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 text-sm px-4 py-3">{error}</div>
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
            <div className="block">
              <label className="block">
                <span className="text-neutral-800 dark:text-neutral-200">Password</span>
                <PasswordInput
                  name="password"
                  placeholder="Create a password"
                  required
                  className="mt-1"
                  onChange={(e) => setPassword(e.target.value)}
                />
              </label>
              {fieldErrors?.password && (
                <span className="text-xs text-red-600">{fieldErrors.password[0]}</span>
              )}
              {/* Password strength indicator */}
              {password.length > 0 && (
                <div className="mt-2 space-y-1.5">
                  <div className={`h-1.5 w-full rounded-full ${strength.bgColor}`}>
                    <div
                      className={`h-full rounded-full transition-all duration-300 ease-out ${strength.color}`}
                      style={{ width: `${(strength.score / 5) * 100}%` }}
                    />
                  </div>
                  <p className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
                    Password strength:{" "}
                    <span
                      className={
                        strength.label === "Weak"
                          ? "text-red-600 dark:text-red-400"
                          : strength.label === "Fair"
                            ? "text-orange-600 dark:text-orange-400"
                            : strength.label === "Good"
                              ? "text-yellow-600 dark:text-yellow-400"
                              : "text-green-600 dark:text-green-400"
                      }
                    >
                      {strength.label}
                    </span>
                  </p>
                </div>
              )}
            </div>
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
