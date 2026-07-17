"use client";

import React, { useState, useTransition } from "react";
import Label from "@/components/Label";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import ButtonPrimary from "@/components/ui/ButtonPrimary";
import { sendContactMessage } from "@/actions/contact";

const PageContact: React.FC = () => {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[] | undefined>>();
  const [sent, setSent] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setFieldErrors(undefined);
    const formData = new FormData(e.currentTarget);
    const form = e.currentTarget;

    startTransition(async () => {
      const result = await sendContactMessage(formData);
      if (!result.success) {
        setError(result.error.message);
        setFieldErrors(result.error.fieldErrors);
        return;
      }
      setSent(true);
      form.reset();
    });
  }

  return (
    <div className="nc-PageContact overflow-hidden">
      <div className="mb-24 lg:mb-32">
        <h2 className="my-16 sm:my-20 flex items-center text-3xl leading-[115%] md:text-5xl md:leading-[115%] font-semibold text-neutral-900 dark:text-neutral-100 justify-center">
          We&apos;re Here to Help
        </h2>
        <div className="container max-w-7xl mx-auto">
          <div className="flex-shrink-0 grid grid-cols-1 sm:grid-cols-2 gap-12">
            <div className="max-w-sm space-y-8">
              <div>
                <h3 className="uppercase font-semibold text-sm dark:text-neutral-200 tracking-wider">
                  Email
                </h3>
                <span className="block mt-2 text-neutral-500 dark:text-neutral-400">
                  support@potomac.com
                </span>
              </div>
              <div>
                <h3 className="uppercase font-semibold text-sm dark:text-neutral-200 tracking-wider">
                  Response time
                </h3>
                <span className="block mt-2 text-neutral-500 dark:text-neutral-400">
                  We typically reply within a few hours — our support team is available 24/7.
                </span>
              </div>
            </div>
            <div>
              {sent ? (
                <div className="rounded-2xl bg-neutral-50 dark:bg-neutral-800 p-8 text-center">
                  <h3 className="text-lg font-semibold">Message sent</h3>
                  <p className="mt-2 text-neutral-500 dark:text-neutral-400">
                    Thanks for reaching out — our team will get back to you soon.
                  </p>
                </div>
              ) : (
                <form className="grid grid-cols-1 gap-6" onSubmit={handleSubmit}>
                  {error && (
                    <div className="rounded-lg bg-red-50 text-red-700 text-sm px-4 py-3">{error}</div>
                  )}
                  <label className="block">
                    <Label>Full name</Label>
                    <Input name="name" placeholder="Your name" type="text" required className="mt-1" />
                    {fieldErrors?.name && (
                      <span className="text-xs text-red-600">{fieldErrors.name[0]}</span>
                    )}
                  </label>
                  <label className="block">
                    <Label>Email address</Label>
                    <Input
                      name="email"
                      type="email"
                      placeholder="you@example.com"
                      required
                      className="mt-1"
                    />
                    {fieldErrors?.email && (
                      <span className="text-xs text-red-600">{fieldErrors.email[0]}</span>
                    )}
                  </label>
                  <label className="block">
                    <Label>Message</Label>
                    <Textarea name="message" className="mt-1" rows={6} required />
                    {fieldErrors?.message && (
                      <span className="text-xs text-red-600">{fieldErrors.message[0]}</span>
                    )}
                  </label>
                  <div>
                    <ButtonPrimary type="submit" loading={isPending} disabled={isPending}>
                      Send Message
                    </ButtonPrimary>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PageContact;
