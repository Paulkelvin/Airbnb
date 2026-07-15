"use client";

export interface CloudinaryUploadResult {
  url: string;
  publicId: string;
  width: number;
  height: number;
}

export class CloudinaryUploadError extends Error {}

/**
 * Unsigned direct-from-browser upload. Requires NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
 * and an unsigned upload preset (NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET) scoped to
 * image formats only. The API secret is never exposed to the client.
 */
export async function uploadListingImage(
  file: File,
): Promise<CloudinaryUploadResult> {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) {
    throw new CloudinaryUploadError(
      "Image uploads are not configured yet. Set NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME and NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET.",
    );
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", uploadPreset);
  formData.append("folder", "listings");

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

export function isImageUploadConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME &&
      process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET,
  );
}
