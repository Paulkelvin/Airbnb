"use client";

import React, { useRef, useState, useTransition } from "react";
import { useSession } from "next-auth/react";
import Label from "@/components/Label";
import Avatar from "@/components/ui/Avatar";
import ButtonPrimary from "@/components/ui/ButtonPrimary";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import { updateProfile } from "@/actions/profile";
import { uploadAvatarImage, isImageUploadConfigured } from "@/lib/cloudinary-upload";
import { CameraIcon } from "@heroicons/react/24/outline";

export interface ProfileFormProps {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  bio: string;
  avatarUrl: string | null;
}

const ProfileForm: React.FC<ProfileFormProps> = ({
  email,
  firstName,
  lastName,
  phone,
  bio,
  avatarUrl,
}) => {
  const { update } = useSession();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[] | undefined>>();
  const [saved, setSaved] = useState(false);
  const [avatar, setAvatar] = useState(avatarUrl);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleAvatarSelect(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    if (!isImageUploadConfigured()) {
      setError("Image uploads aren't configured yet.");
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const result = await uploadAvatarImage(file);
      setAvatar(result.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setFieldErrors(undefined);
    setSaved(false);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await updateProfile(formData);
      if (!result.success) {
        setError(result.error.message);
        setFieldErrors(result.error.fieldErrors);
        return;
      }
      await update({
        firstName: formData.get("firstName"),
        lastName: formData.get("lastName"),
        avatarUrl: avatar || null,
      });
      setSaved(true);
    });
  }

  return (
    <div className="flex flex-col md:flex-row">
      <div className="flex-shrink-0 flex items-start">
        <div className="relative rounded-full overflow-hidden flex">
          <Avatar sizeClass="w-32 h-32" imgUrl={avatar || undefined} userName={`${firstName} ${lastName}`} />
          <div
            className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 text-white opacity-0 hover:opacity-100 transition-opacity cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? (
              <span className="text-xs">Uploading&hellip;</span>
            ) : (
              <CameraIcon className="w-8 h-8" />
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleAvatarSelect(e.target.files)}
          />
        </div>
      </div>
      <div className="flex-grow mt-10 md:mt-0 md:pl-16 max-w-3xl space-y-6">
        {error && (
          <div className="rounded-lg bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 text-sm px-4 py-3">{error}</div>
        )}
        {saved && (
          <div className="rounded-lg bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 text-sm px-4 py-3">
            Your profile has been updated.
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-6">
          <input type="hidden" name="avatarUrl" value={avatar || ""} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>First name</Label>
              <Input name="firstName" defaultValue={firstName} required className="mt-1.5" />
              {fieldErrors?.firstName && (
                <span className="text-xs text-red-600">{fieldErrors.firstName[0]}</span>
              )}
            </div>
            <div>
              <Label>Last name</Label>
              <Input name="lastName" defaultValue={lastName} required className="mt-1.5" />
              {fieldErrors?.lastName && (
                <span className="text-xs text-red-600">{fieldErrors.lastName[0]}</span>
              )}
            </div>
          </div>
          <div>
            <Label>Email</Label>
            <Input className="mt-1.5" defaultValue={email} readOnly />
          </div>
          <div>
            <Label>Phone number</Label>
            <Input name="phone" defaultValue={phone} placeholder="Your phone number" className="mt-1.5" />
            {fieldErrors?.phone && (
              <span className="text-xs text-red-600">{fieldErrors.phone[0]}</span>
            )}
          </div>
          <div>
            <Label>About you</Label>
            <Textarea
              name="bio"
              defaultValue={bio}
              placeholder="Tell us about yourself..."
              className="mt-1.5"
            />
            {fieldErrors?.bio && (
              <span className="text-xs text-red-600">{fieldErrors.bio[0]}</span>
            )}
          </div>
          <div className="pt-2">
            <ButtonPrimary type="submit" loading={isPending} disabled={isPending || uploading}>
              Update info
            </ButtonPrimary>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfileForm;
