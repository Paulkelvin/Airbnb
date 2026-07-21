"use client";

import { useEffect, useState, useTransition } from "react";
import { signIn } from "next-auth/react";
import Input from "@/components/ui/Input";
import ButtonPrimary from "@/components/ui/ButtonPrimary";
import { requestBookingOtp } from "@/actions/auth";

const RESEND_COOLDOWN_SECONDS = 30;

/**
 * Inline, passwordless identity step for the booking widget — replaces the
 * old hard "Log in to book" wall. Collects just enough to create/find an
 * account (name + email), emails a 6-digit code, then verifies it via the
 * "otp" NextAuth CredentialsProvider (auth-options.ts). No password is ever
 * involved: an unrecognized email gets an account created for it at
 * verification time.
 */
export default function InlineBookingAuth({
  onAuthenticated,
}: {
  onAuthenticated: () => void;
}) {
  const [step, setStep] = useState<"details" | "code">("details");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  function requestCode() {
    setError(null);
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("fullName", fullName);
        formData.set("email", email);
        const result = await requestBookingOtp(formData);
        if (!result.success) {
          setError(result.error.message);
          return;
        }
        setStep("code");
        setCooldown(RESEND_COOLDOWN_SECONDS);
      } catch {
        setError("Something went wrong sending the code. Please try again.");
      }
    });
  }

  function handleDetailsSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    requestCode();
  }

  function handleCodeSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        const result = await signIn("otp", { email, code, redirect: false });
        if (result?.error) {
          setError(
            result.error === "RATE_LIMITED"
              ? "Too many attempts. Please try again shortly."
              : "That code is incorrect or has expired.",
          );
          return;
        }
        onAuthenticated();
      } catch {
        setError("Something went wrong confirming the code. Please try again.");
      }
    });
  }

  if (step === "code") {
    return (
      <form
        onSubmit={handleCodeSubmit}
        className="space-y-3 border border-neutral-200 dark:border-neutral-700 rounded-2xl p-4"
      >
        <p className="text-sm text-neutral-600 dark:text-neutral-300">
          We sent a 6-digit code to <strong>{email}</strong>
        </p>
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="Code"
          required
          sizeClass="h-11 px-4 py-3"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <ButtonPrimary type="submit" loading={isPending} disabled={isPending} className="w-full">
          Confirm
        </ButtonPrimary>
        <div className="flex items-center justify-between text-xs">
          <button
            type="button"
            onClick={() => {
              setStep("details");
              setCode("");
              setError(null);
            }}
            className="underline text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
          >
            Change email
          </button>
          <button
            type="button"
            onClick={requestCode}
            disabled={cooldown > 0 || isPending}
            className="underline text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 disabled:opacity-50 disabled:no-underline"
          >
            {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
          </button>
        </div>
      </form>
    );
  }

  return (
    <form
      onSubmit={handleDetailsSubmit}
      className="space-y-3 border border-neutral-200 dark:border-neutral-700 rounded-2xl p-4"
    >
      <p className="text-sm font-medium">Confirm your booking</p>
      <Input
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        placeholder="Full name"
        autoComplete="name"
        required
        sizeClass="h-11 px-4 py-3"
      />
      <Input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        autoComplete="email"
        required
        sizeClass="h-11 px-4 py-3"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <ButtonPrimary type="submit" loading={isPending} disabled={isPending} className="w-full">
        Continue
      </ButtonPrimary>
      <p className="text-xs text-neutral-400">
        We&apos;ll email you a code — no password needed.
      </p>
    </form>
  );
}
