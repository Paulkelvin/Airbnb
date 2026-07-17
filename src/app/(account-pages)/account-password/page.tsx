"use client";

import { useState, useTransition } from "react";
import Label from "@/components/Label";
import ButtonPrimary from "@/components/ui/ButtonPrimary";
import PasswordInput from "@/components/ui/PasswordInput";
import { changePassword } from "@/actions/auth";

const AccountPass = () => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[] | undefined>>({});
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setSuccess(false);
    const formData = new FormData();
    formData.set("currentPassword", currentPassword);
    formData.set("password", password);
    formData.set("confirmPassword", confirmPassword);

    startTransition(async () => {
      const result = await changePassword(formData);
      if (!result.success) {
        setError(result.error.message);
        if (result.error.fieldErrors) {
          setFieldErrors(result.error.fieldErrors);
        }
        return;
      }
      setSuccess(true);
      setCurrentPassword("");
      setPassword("");
      setConfirmPassword("");
    });
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* HEADING */}
      <h1 className="text-3xl font-semibold">Security</h1>
      <div className="w-14 border-b border-neutral-200 dark:border-neutral-700"></div>
      <form className=" max-w-xl space-y-6" onSubmit={handleSubmit}>
        <div>
          <Label>Current password</Label>
          <PasswordInput
            className="mt-1.5"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
          {fieldErrors.currentPassword && (
            <p className="text-sm text-red-600 mt-1">{fieldErrors.currentPassword[0]}</p>
          )}
        </div>
        <div>
          <Label>New password</Label>
          <PasswordInput className="mt-1.5" value={password} onChange={(e) => setPassword(e.target.value)} />
          {fieldErrors.password && (
            <p className="text-sm text-red-600 mt-1">{fieldErrors.password[0]}</p>
          )}
        </div>
        <div>
          <Label>Confirm password</Label>
          <PasswordInput
            className="mt-1.5"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          {fieldErrors.confirmPassword && (
            <p className="text-sm text-red-600 mt-1">{fieldErrors.confirmPassword[0]}</p>
          )}
        </div>
        {error && !Object.keys(fieldErrors).length && <p className="text-sm text-red-600">{error}</p>}
        {success && <p className="text-sm text-green-600">Password updated successfully.</p>}
        <div className="pt-2">
          <ButtonPrimary
            type="submit"
            loading={isPending}
            disabled={isPending || !currentPassword || !password || !confirmPassword}
          >
            Update password
          </ButtonPrimary>
        </div>
      </form>
    </div>
  );
};

export default AccountPass;
