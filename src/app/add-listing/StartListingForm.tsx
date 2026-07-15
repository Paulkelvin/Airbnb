"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import ButtonPrimary from "@/components/ui/ButtonPrimary";
import FormItem from "./FormItem";
import { createDraftListing } from "@/modules/listings/actions";

export interface StartListingFormProps {
  propertyTypes: { id: string; name: string; slug: string }[];
}

export default function StartListingForm({ propertyTypes }: StartListingFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [propertyTypeId, setPropertyTypeId] = useState(propertyTypes[0]?.id ?? "");
  const [rentalType, setRentalType] = useState<"SHORT_TERM" | "LONG_TERM">("SHORT_TERM");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createDraftListing({ title, propertyTypeId, rentalType });
      if (!result.success) {
        setError(result.error.message);
        return;
      }
      router.push(`/add-listing/${result.data.id}`);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {error && (
        <div className="rounded-lg bg-red-50 text-red-700 text-sm px-4 py-3">{error}</div>
      )}
      <FormItem
        label="Place name"
        desc="A catchy name usually includes: property type + neighborhood + a standout feature"
      >
        <Input
          placeholder="Sunny two-bedroom near the park"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          minLength={5}
        />
      </FormItem>
      <FormItem label="Property type">
        <Select value={propertyTypeId} onChange={(e) => setPropertyTypeId(e.target.value)}>
          {propertyTypes.map((pt) => (
            <option key={pt.id} value={pt.id}>
              {pt.name}
            </option>
          ))}
        </Select>
      </FormItem>
      <FormItem
        label="Rental type"
        desc="Short-term: nightly bookings with an availability calendar. Long-term: monthly leases."
      >
        <Select
          value={rentalType}
          onChange={(e) => setRentalType(e.target.value as "SHORT_TERM" | "LONG_TERM")}
        >
          <option value="SHORT_TERM">Short-term (nightly)</option>
          <option value="LONG_TERM">Long-term (monthly lease)</option>
        </Select>
      </FormItem>
      <div className="flex justify-end">
        <ButtonPrimary type="submit" loading={isPending} disabled={isPending || !propertyTypeId}>
          Continue
        </ButtonPrimary>
      </div>
    </form>
  );
}
