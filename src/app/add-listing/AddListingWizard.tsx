"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";
import Checkbox from "@/components/ui/Checkbox";
import NcInputNumber from "@/components/NcInputNumber";
import ButtonPrimary from "@/components/ui/ButtonPrimary";
import ButtonSecondary from "@/components/ui/ButtonSecondary";
import FormItem from "./FormItem";
import { saveListingDraft, publishListing, deleteUploadedImage } from "@/modules/listings/actions";
import { uploadListingImage, isImageUploadConfigured } from "@/lib/cloudinary-upload";

export interface WizardImage {
  url: string;
  publicId: string;
  position: number;
  isCover: boolean;
  width?: number | null;
  height?: number | null;
}

export interface WizardListing {
  id: string;
  slug: string;
  status: string;
  rentalType: "SHORT_TERM" | "LONG_TERM";
  title: string;
  description: string;
  propertyTypeId: string;
  bedrooms: number;
  bathrooms: number;
  maxOccupants: number;
  sizeSqft: number | null;
  currency: string;
  amenityIds: string[];
  images: WizardImage[];
  address: {
    line1: string;
    line2: string | null;
    city: string;
    region: string;
    postalCode: string;
    country: string;
    latitude: number | null;
    longitude: number | null;
  } | null;
  nightlyPrice: number | null;
  cleaningFee: number | null;
  minNights: number | null;
  maxNights: number | null;
  weeklyDiscountPercent: number | null;
  monthlyDiscountPercent: number | null;
  checkInTime: string | null;
  checkOutTime: string | null;
  instantBook: boolean | null;
  cancellationPolicy: string | null;
  monthlyRent: number | null;
  securityDeposit: number | null;
  minLeaseTermMonths: number | null;
  maxLeaseTermMonths: number | null;
  availableFromDate: string | null;
  utilitiesIncluded: boolean | null;
  petPolicy: string | null;
  earlyTerminationPolicy: string | null;
}

const STEPS = [
  "Location",
  "Capacity",
  "Amenities",
  "Policies",
  "Description",
  "Photos",
  "Pricing",
  "Review",
] as const;

const AMENITY_CATEGORY_LABELS: Record<string, string> = {
  BASIC: "Basic",
  SAFETY: "Safety",
  OUTDOOR: "Outdoor",
  KITCHEN: "Kitchen",
  ENTERTAINMENT: "Entertainment",
  ACCESSIBILITY: "Accessibility",
  PARKING: "Parking",
  CLIMATE: "Climate",
};

export interface AddListingWizardProps {
  initialListing: WizardListing;
  propertyTypes: { id: string; name: string; slug: string }[];
  amenities: { id: string; name: string; slug: string; category: string | null; icon: string | null }[];
}

export default function AddListingWizard({
  initialListing,
  propertyTypes,
  amenities,
}: AddListingWizardProps) {
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);
  const [listing, setListing] = useState<WizardListing>(initialListing);
  const [selectedAmenityIds, setSelectedAmenityIds] = useState<Set<string>>(
    new Set(initialListing.amenityIds),
  );
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<
    Record<string, string[] | undefined> | undefined
  >();
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [flexibleCheckInOut, setFlexibleCheckInOut] = useState(
    initialListing.checkInTime === null && initialListing.checkOutTime === null,
  );

  const amenitiesByCategory = amenities.reduce<Record<string, typeof amenities>>((acc, a) => {
    const key = a.category ?? "OTHER";
    (acc[key] ??= []).push(a);
    return acc;
  }, {});

  const checklist = getCompletionChecklist(listing);
  const canPublish = checklist.every((item) => item.done);

  function update<K extends keyof WizardListing>(key: K, value: WizardListing[K]) {
    setListing((prev) => ({ ...prev, [key]: value }));
  }

  function goBack() {
    setError(null);
    setFieldErrors(undefined);
    setStepIndex((i) => Math.max(0, i - 1));
  }

  function saveStepAndAdvance(payload: Record<string, unknown>) {
    setError(null);
    setFieldErrors(undefined);
    startTransition(async () => {
      const result = await saveListingDraft({ id: listing.id, ...payload } as never);
      if (!result.success) {
        setError(result.error.message);
        setFieldErrors(result.error.fieldErrors);
        return;
      }
      setStepIndex((i) => Math.min(STEPS.length - 1, i + 1));
    });
  }

  async function handleFileSelect(files: FileList | null) {
    if (!files || files.length === 0) return;
    if (!isImageUploadConfigured()) {
      setError(
        "Image uploads aren't configured yet — set NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME and NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET.",
      );
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const uploaded: WizardImage[] = [];
      for (const file of Array.from(files)) {
        const result = await uploadListingImage(file);
        uploaded.push({
          url: result.url,
          publicId: result.publicId,
          width: result.width,
          height: result.height,
          position: listing.images.length + uploaded.length,
          isCover: listing.images.length === 0 && uploaded.length === 0,
        });
      }
      update("images", [...listing.images, ...uploaded]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function removeImage(publicId: string) {
    startTransition(async () => {
      await deleteUploadedImage(publicId);
      const remaining = listing.images
        .filter((img) => img.publicId !== publicId)
        .map((img, i) => ({ ...img, position: i, isCover: i === 0 }));
      update("images", remaining);
    });
  }

  function handlePublish() {
    setError(null);
    setFieldErrors(undefined);
    startTransition(async () => {
      const result = await publishListing(listing.id);
      if (!result.success) {
        setError(result.error.message);
        setFieldErrors(result.error.fieldErrors);
        return;
      }
      router.push("/account-listings");
    });
  }

  function handleSaveDraftAndExit() {
    router.push("/account-listings");
  }

  const stepContent = () => {
    switch (STEPS[stepIndex]) {
      case "Location":
        return (
          <>
            <h2 className="text-2xl font-semibold">Where&apos;s your place located?</h2>
            <div className="w-14 border-b border-neutral-200 dark:border-neutral-700" />
            <div className="space-y-8">
              <FormItem label="Street address">
                <Input
                  value={listing.address?.line1 ?? ""}
                  onChange={(e) =>
                    update("address", { ...emptyAddress(listing.address), line1: e.target.value })
                  }
                />
              </FormItem>
              <FormItem label="Apt / suite (optional)">
                <Input
                  value={listing.address?.line2 ?? ""}
                  onChange={(e) =>
                    update("address", { ...emptyAddress(listing.address), line2: e.target.value })
                  }
                />
              </FormItem>
              <div className="grid grid-cols-2 gap-4">
                <FormItem label="City">
                  <Input
                    value={listing.address?.city ?? ""}
                    onChange={(e) =>
                      update("address", { ...emptyAddress(listing.address), city: e.target.value })
                    }
                  />
                </FormItem>
                <FormItem label="State / Region">
                  <Input
                    value={listing.address?.region ?? ""}
                    onChange={(e) =>
                      update("address", { ...emptyAddress(listing.address), region: e.target.value })
                    }
                  />
                </FormItem>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormItem label="Postal code">
                  <Input
                    value={listing.address?.postalCode ?? ""}
                    onChange={(e) =>
                      update("address", {
                        ...emptyAddress(listing.address),
                        postalCode: e.target.value,
                      })
                    }
                  />
                </FormItem>
                <FormItem label="Country code" desc="Two-letter code, e.g. US">
                  <Input
                    maxLength={2}
                    value={listing.address?.country ?? ""}
                    onChange={(e) =>
                      update("address", {
                        ...emptyAddress(listing.address),
                        country: e.target.value.toUpperCase(),
                      })
                    }
                  />
                </FormItem>
              </div>
            </div>
          </>
        );

      case "Capacity":
        return (
          <>
            <h2 className="text-2xl font-semibold">Share some basics about your place</h2>
            <div className="w-14 border-b border-neutral-200 dark:border-neutral-700" />
            <div className="space-y-8">
              <NcInputNumber
                label="Guests"
                defaultValue={listing.maxOccupants}
                min={1}
                onChange={(v) => update("maxOccupants", v)}
              />
              <NcInputNumber
                label="Bedrooms"
                defaultValue={listing.bedrooms}
                min={0}
                onChange={(v) => update("bedrooms", v)}
              />
              <NcInputNumber
                label="Bathrooms"
                defaultValue={listing.bathrooms}
                min={0}
                onChange={(v) => update("bathrooms", v)}
              />
              <FormItem label="Size (sqft, optional)">
                <Input
                  type="number"
                  min={0}
                  value={listing.sizeSqft ?? ""}
                  onChange={(e) =>
                    update("sizeSqft", e.target.value ? Number(e.target.value) : null)
                  }
                />
              </FormItem>
            </div>
          </>
        );

      case "Amenities":
        return (
          <>
            <h2 className="text-2xl font-semibold">Amenities</h2>
            <div className="w-14 border-b border-neutral-200 dark:border-neutral-700" />
            <div className="space-y-8">
              {Object.entries(amenitiesByCategory).map(([category, items]) => (
                <div key={category}>
                  <label className="text-lg font-semibold">
                    {AMENITY_CATEGORY_LABELS[category] ?? category}
                  </label>
                  <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {items.map((a) => (
                      <Checkbox
                        key={a.id}
                        name={a.id}
                        label={a.name}
                        defaultChecked={selectedAmenityIds.has(a.id)}
                        onChange={(checked) => {
                          setSelectedAmenityIds((prev) => {
                            const next = new Set(prev);
                            if (checked) next.add(a.id);
                            else next.delete(a.id);
                            return next;
                          });
                        }}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        );

      case "Policies":
        return listing.rentalType === "SHORT_TERM" ? (
          <>
            <h2 className="text-2xl font-semibold">Booking policies</h2>
            <div className="w-14 border-b border-neutral-200 dark:border-neutral-700" />
            <div className="space-y-8">
              <Checkbox
                name="flexibleCheckInOut"
                label="No fixed check-in/check-out time"
                subLabel="Choose this for self check-in or a flexible arrival — guests won't see a specific time"
                defaultChecked={flexibleCheckInOut}
                onChange={(checked) => {
                  setFlexibleCheckInOut(checked);
                  if (checked) {
                    update("checkInTime", null);
                    update("checkOutTime", null);
                  } else {
                    update("checkInTime", listing.checkInTime ?? "15:00");
                    update("checkOutTime", listing.checkOutTime ?? "11:00");
                  }
                }}
              />
              {!flexibleCheckInOut && (
                <div className="grid grid-cols-2 gap-4">
                  <FormItem label="Check-in time">
                    <Input
                      type="time"
                      value={listing.checkInTime ?? "15:00"}
                      onChange={(e) => update("checkInTime", e.target.value)}
                    />
                  </FormItem>
                  <FormItem label="Check-out time">
                    <Input
                      type="time"
                      value={listing.checkOutTime ?? "11:00"}
                      onChange={(e) => update("checkOutTime", e.target.value)}
                    />
                  </FormItem>
                </div>
              )}
              <FormItem label="Cancellation policy">
                <Select
                  value={listing.cancellationPolicy ?? "MODERATE"}
                  onChange={(e) => update("cancellationPolicy", e.target.value)}
                >
                  <option value="FLEXIBLE">Flexible</option>
                  <option value="MODERATE">Moderate</option>
                  <option value="STRICT">Strict</option>
                </Select>
              </FormItem>
              <Checkbox
                name="instantBook"
                label="Allow instant booking"
                defaultChecked={listing.instantBook ?? false}
                onChange={(checked) => update("instantBook", checked)}
              />
            </div>
          </>
        ) : (
          <>
            <h2 className="text-2xl font-semibold">Lease policies</h2>
            <div className="w-14 border-b border-neutral-200 dark:border-neutral-700" />
            <div className="space-y-8">
              <FormItem label="Pet policy">
                <Select
                  value={listing.petPolicy ?? "NOT_ALLOWED"}
                  onChange={(e) => update("petPolicy", e.target.value)}
                >
                  <option value="NOT_ALLOWED">Not allowed</option>
                  <option value="ALLOWED">Allowed</option>
                  <option value="CASE_BY_CASE">Case by case</option>
                </Select>
              </FormItem>
              <FormItem label="Early termination policy">
                <Select
                  value={listing.earlyTerminationPolicy ?? "STANDARD"}
                  onChange={(e) => update("earlyTerminationPolicy", e.target.value)}
                >
                  <option value="STANDARD">Standard</option>
                  <option value="STRICT">Strict</option>
                </Select>
              </FormItem>
              <Checkbox
                name="utilitiesIncluded"
                label="Utilities included in rent"
                defaultChecked={listing.utilitiesIncluded ?? false}
                onChange={(checked) => update("utilitiesIncluded", checked)}
              />
            </div>
          </>
        );

      case "Description":
        return (
          <>
            <h2 className="text-2xl font-semibold">Describe your place</h2>
            <div className="w-14 border-b border-neutral-200 dark:border-neutral-700" />
            <FormItem>
              <Textarea
                rows={8}
                value={listing.description}
                onChange={(e) => update("description", e.target.value)}
                placeholder="What makes your place special? (at least 20 characters)"
              />
            </FormItem>
          </>
        );

      case "Photos":
        return (
          <>
            <h2 className="text-2xl font-semibold">Add photos</h2>
            <span className="block mt-2 text-neutral-500 dark:text-neutral-400">
              The first photo is used as the cover image.
            </span>
            <div className="w-14 border-b border-neutral-200 dark:border-neutral-700" />
            <div className="space-y-6">
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-neutral-300 dark:border-neutral-6000 border-dashed rounded-md">
                <div className="space-y-1 text-center">
                  <div className="flex text-sm text-neutral-6000 dark:text-neutral-300">
                    <label
                      htmlFor="listing-image-upload"
                      className="relative cursor-pointer rounded-md font-medium text-primary-6000 hover:text-primary-500"
                    >
                      <span>{uploading ? "Uploading..." : "Upload photos"}</span>
                      <input
                        ref={fileInputRef}
                        id="listing-image-upload"
                        type="file"
                        accept="image/*"
                        multiple
                        disabled={uploading}
                        className="sr-only"
                        onChange={(e) => handleFileSelect(e.target.files)}
                      />
                    </label>
                  </div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    PNG or JPG, up to 10MB each — larger photos are resized automatically
                  </p>
                </div>
              </div>
              {listing.images.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {listing.images.map((img) => (
                    <div key={img.publicId} className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={img.url}
                        alt=""
                        className="w-full h-32 object-cover rounded-lg"
                      />
                      {img.isCover && (
                        <span className="absolute top-2 left-2 text-xs bg-white/90 px-2 py-0.5 rounded-full font-medium">
                          Cover
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => removeImage(img.publicId)}
                        className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 text-white text-xs flex items-center justify-center"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        );

      case "Pricing":
        return listing.rentalType === "SHORT_TERM" ? (
          <>
            <h2 className="text-2xl font-semibold">Set your price</h2>
            <div className="w-14 border-b border-neutral-200 dark:border-neutral-700" />
            <div className="space-y-8">
              <div className="grid grid-cols-2 gap-4">
                <FormItem label="Nightly price ($)">
                  <Input
                    type="number"
                    min={0}
                    value={listing.nightlyPrice ?? ""}
                    onChange={(e) => update("nightlyPrice", Number(e.target.value))}
                  />
                </FormItem>
                <FormItem label="Cleaning fee ($, optional)">
                  <Input
                    type="number"
                    min={0}
                    value={listing.cleaningFee ?? ""}
                    onChange={(e) =>
                      update("cleaningFee", e.target.value ? Number(e.target.value) : null)
                    }
                  />
                </FormItem>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormItem label="Minimum nights">
                  <Input
                    type="number"
                    min={1}
                    value={listing.minNights ?? 1}
                    onChange={(e) => update("minNights", Number(e.target.value))}
                  />
                </FormItem>
                <FormItem label="Maximum nights (optional)">
                  <Input
                    type="number"
                    min={1}
                    value={listing.maxNights ?? ""}
                    onChange={(e) =>
                      update("maxNights", e.target.value ? Number(e.target.value) : null)
                    }
                  />
                </FormItem>
              </div>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-2xl font-semibold">Set your rent</h2>
            <div className="w-14 border-b border-neutral-200 dark:border-neutral-700" />
            <div className="space-y-8">
              <div className="grid grid-cols-2 gap-4">
                <FormItem label="Monthly rent ($)">
                  <Input
                    type="number"
                    min={0}
                    value={listing.monthlyRent ?? ""}
                    onChange={(e) => update("monthlyRent", Number(e.target.value))}
                  />
                </FormItem>
                <FormItem label="Security deposit ($, optional)">
                  <Input
                    type="number"
                    min={0}
                    value={listing.securityDeposit ?? ""}
                    onChange={(e) =>
                      update("securityDeposit", e.target.value ? Number(e.target.value) : null)
                    }
                  />
                </FormItem>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormItem label="Minimum lease (months)">
                  <Input
                    type="number"
                    min={1}
                    value={listing.minLeaseTermMonths ?? 12}
                    onChange={(e) => update("minLeaseTermMonths", Number(e.target.value))}
                  />
                </FormItem>
                <FormItem label="Maximum lease (months, optional)">
                  <Input
                    type="number"
                    min={1}
                    value={listing.maxLeaseTermMonths ?? ""}
                    onChange={(e) =>
                      update(
                        "maxLeaseTermMonths",
                        e.target.value ? Number(e.target.value) : null,
                      )
                    }
                  />
                </FormItem>
              </div>
            </div>
          </>
        );

      case "Review":
        return (
          <>
            <h2 className="text-2xl font-semibold">Review &amp; publish</h2>
            <div className="w-14 border-b border-neutral-200 dark:border-neutral-700" />
            <div className="space-y-4">
              <p>
                <strong>{listing.title}</strong>
              </p>
              <p className="text-neutral-500">
                {listing.rentalType === "SHORT_TERM"
                  ? `$${listing.nightlyPrice ?? "—"}/night`
                  : `$${listing.monthlyRent ?? "—"}/month`}
              </p>
              <p className="text-neutral-500">
                {listing.bedrooms} bed · {listing.bathrooms} bath · up to{" "}
                {listing.maxOccupants} guests
              </p>
              <p className="text-neutral-500">{listing.images.length} photo(s) added</p>
              <p className="text-neutral-500">
                {listing.address
                  ? `${listing.address.city}, ${listing.address.country}`
                  : "No address set"}
              </p>
            </div>
            {!canPublish && (
              <div className="mt-2">
                <h3 className="text-base font-semibold mb-3">Before you publish</h3>
                <ul className="space-y-2">
                  {checklist.map((item) => (
                    <li
                      key={item.label}
                      className="flex items-center justify-between gap-4 text-sm"
                    >
                      <span
                        className={
                          item.done
                            ? "text-neutral-500 dark:text-neutral-400"
                            : "text-red-600 dark:text-red-400"
                        }
                      >
                        {item.done ? "✓" : "○"} {item.label}
                      </span>
                      {!item.done && (
                        <button
                          type="button"
                          onClick={() => setStepIndex(item.stepIndex)}
                          className="text-primary-6000 underline text-xs flex-shrink-0"
                        >
                          Fix
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        );
    }
  };

  const isLastStep = stepIndex === STEPS.length - 1;

  return (
    <div className="px-4 max-w-3xl mx-auto pb-24 pt-14 sm:py-24 lg:pb-32">
      <div className="space-y-11">
        <div>
          <span className="text-4xl font-semibold">{stepIndex + 1}</span>{" "}
          <span className="text-lg text-neutral-500 dark:text-neutral-400">
            / {STEPS.length} — {STEPS[stepIndex]}
          </span>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 text-sm px-4 py-3">
            {error}
            {fieldErrors && (
              <ul className="mt-2 list-disc list-inside">
                {Object.entries(fieldErrors).map(([field, messages]) => (
                  <li key={field}>
                    {field}: {messages?.join(", ")}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="listingSection__wrap">{stepContent()}</div>

        <div className="flex justify-between space-x-5">
          <ButtonSecondary onClick={handleSaveDraftAndExit}>Save &amp; exit</ButtonSecondary>
          <div className="flex space-x-3">
            {stepIndex > 0 && (
              <ButtonSecondary onClick={goBack} disabled={isPending}>
                Go back
              </ButtonSecondary>
            )}
            {!isLastStep && (
              <ButtonPrimary
                disabled={isPending}
                loading={isPending}
                onClick={() =>
                  saveStepAndAdvance(
                    stepPayload(STEPS[stepIndex], listing, selectedAmenityIds, flexibleCheckInOut),
                  )
                }
              >
                Continue
              </ButtonPrimary>
            )}
            {isLastStep && (
              <ButtonPrimary
                disabled={isPending || !canPublish}
                loading={isPending}
                onClick={handlePublish}
              >
                Publish listing
              </ButtonPrimary>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function emptyAddress(current: WizardListing["address"]) {
  return (
    current ?? {
      line1: "",
      line2: null,
      city: "",
      region: "",
      postalCode: "",
      country: "US",
      latitude: null,
      longitude: null,
    }
  );
}

function stepPayload(
  step: (typeof STEPS)[number],
  listing: WizardListing,
  selectedAmenityIds: Set<string>,
  flexibleCheckInOut: boolean,
): Record<string, unknown> {
  switch (step) {
    case "Location":
      return { address: listing.address ?? undefined };
    case "Capacity":
      return {
        bedrooms: listing.bedrooms,
        bathrooms: listing.bathrooms,
        maxOccupants: listing.maxOccupants,
        sizeSqft: listing.sizeSqft ?? undefined,
      };
    case "Amenities":
      return { amenityIds: Array.from(selectedAmenityIds) };
    case "Policies":
      // Defaults here must match what the step's inputs actually display
      // (the `value={listing.x ?? "..."}` fallbacks) — otherwise a user who
      // never touches a pre-filled-looking field would save `null` for a
      // field the strict publish-time schema requires to be a real value.
      // Exception: check-in/out are explicitly null when the host opted into
      // flexible/self check-in, regardless of what the (hidden) inputs hold.
      return listing.rentalType === "SHORT_TERM"
        ? {
            checkInTime: flexibleCheckInOut ? null : (listing.checkInTime ?? "15:00"),
            checkOutTime: flexibleCheckInOut ? null : (listing.checkOutTime ?? "11:00"),
            cancellationPolicy: listing.cancellationPolicy ?? "MODERATE",
            instantBook: listing.instantBook ?? false,
          }
        : {
            petPolicy: listing.petPolicy ?? "NOT_ALLOWED",
            earlyTerminationPolicy: listing.earlyTerminationPolicy ?? "STANDARD",
            utilitiesIncluded: listing.utilitiesIncluded ?? false,
          };
    case "Description":
      return { description: listing.description };
    case "Photos":
      return { images: listing.images };
    case "Pricing":
      // nightlyPrice/monthlyRent must be > 0 per the strict schema, so an
      // unset value is sent as undefined (still incomplete) rather than a
      // fake 0/placeholder that would itself fail validation.
      return listing.rentalType === "SHORT_TERM"
        ? {
            nightlyPrice: listing.nightlyPrice || undefined,
            cleaningFee: listing.cleaningFee ?? undefined,
            minNights: listing.minNights ?? 1,
            maxNights: listing.maxNights ?? undefined,
          }
        : {
            monthlyRent: listing.monthlyRent || undefined,
            securityDeposit: listing.securityDeposit ?? undefined,
            minLeaseTermMonths: listing.minLeaseTermMonths ?? 12,
            maxLeaseTermMonths: listing.maxLeaseTermMonths ?? undefined,
          };
    default:
      return {};
  }
}

function getCompletionChecklist(
  listing: WizardListing,
): { label: string; done: boolean; stepIndex: number }[] {
  return [
    {
      label: "A complete address",
      done: Boolean(
        listing.address?.line1 &&
          listing.address?.city &&
          listing.address?.region &&
          listing.address?.postalCode &&
          listing.address?.country?.length === 2,
      ),
      stepIndex: STEPS.indexOf("Location"),
    },
    {
      label: "A description (at least 20 characters)",
      done: listing.description.trim().length >= 20,
      stepIndex: STEPS.indexOf("Description"),
    },
    {
      label: "At least one photo",
      done: listing.images.length > 0,
      stepIndex: STEPS.indexOf("Photos"),
    },
    {
      label: listing.rentalType === "SHORT_TERM" ? "A nightly price" : "A monthly rent",
      done:
        listing.rentalType === "SHORT_TERM"
          ? Boolean(listing.nightlyPrice && listing.nightlyPrice > 0)
          : Boolean(listing.monthlyRent && listing.monthlyRent > 0),
      stepIndex: STEPS.indexOf("Pricing"),
    },
  ];
}
