"use client";

export interface CloudinaryUploadResult {
  url: string;
  publicId: string;
  width: number;
  height: number;
}

export class CloudinaryUploadError extends Error {}

// Reject absurdly large files outright rather than risk hanging the browser
// trying to decode/resize them.
const MAX_INPUT_MB = 50;
// Ceiling for what actually gets uploaded, after client-side resizing.
const MAX_UPLOAD_MB = 10;
// No point delivering an image wider/taller than this can display at.
const MAX_DIMENSION = 2400;

/**
 * Downscales oversized images client-side before upload (phone cameras
 * routinely produce 10+ MB, 4000px+ photos that are far larger than anything
 * the UI ever displays). Skips files that are already small enough, and
 * silently falls back to the original file if canvas re-encoding fails.
 */
async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const alreadySmall = scale === 1 && file.size <= 2 * 1024 * 1024;
    if (alreadySmall) return file;

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.82),
    );
    if (!blob) return file;

    return new File([blob], file.name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" });
  } catch {
    return file;
  }
}

/**
 * Unsigned direct-from-browser upload. Requires NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
 * and an unsigned upload preset (NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET) scoped to
 * image formats only. The API secret is never exposed to the client.
 */
async function uploadImage(file: File, folder: string): Promise<CloudinaryUploadResult> {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) {
    throw new CloudinaryUploadError(
      "Image uploads are not configured yet. Set NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME and NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET.",
    );
  }

  if (file.size > MAX_INPUT_MB * 1024 * 1024) {
    throw new CloudinaryUploadError(
      `"${file.name}" is too large (max ${MAX_INPUT_MB}MB).`,
    );
  }

  const prepared = await compressImage(file);
  if (prepared.size > MAX_UPLOAD_MB * 1024 * 1024) {
    throw new CloudinaryUploadError(
      `"${file.name}" is too large (max ${MAX_UPLOAD_MB}MB after resizing).`,
    );
  }

  const formData = new FormData();
  formData.append("file", prepared);
  formData.append("upload_preset", uploadPreset);
  formData.append("folder", folder);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    { method: "POST", body: formData },
  );

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new CloudinaryUploadError(
      body?.error?.message ?? `Upload failed with status ${response.status}`,
    );
  }

  const data = await response.json();

  return {
    url: data.secure_url,
    publicId: data.public_id,
    width: data.width,
    height: data.height,
  };
}

export async function uploadListingImage(file: File): Promise<CloudinaryUploadResult> {
  return uploadImage(file, "listings");
}

export async function uploadAvatarImage(file: File): Promise<CloudinaryUploadResult> {
  return uploadImage(file, "avatars");
}

export function isImageUploadConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME &&
      process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET,
  );
}
