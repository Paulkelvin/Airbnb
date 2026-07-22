"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveAboutPage, type AboutPageFormInput } from "@/modules/cms/actions";
import { blocksToPlainText } from "@/modules/cms/portable-text";
import type { CmsAboutPage } from "@/modules/cms/queries";
import { uploadAboutPageImage, isImageUploadConfigured } from "@/lib/cloudinary-upload";

export default function AboutPageForm({ aboutPage }: { aboutPage: CmsAboutPage | null }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [heroTitle, setHeroTitle] = useState(aboutPage?.heroTitle ?? "Our Story");
  const [heroSubtitle, setHeroSubtitle] = useState(
    aboutPage?.heroSubtitle ?? "A peaceful riverside retreat, hosted directly by our team.",
  );
  const [heroBodyText, setHeroBodyText] = useState(() => blocksToPlainText(aboutPage?.heroBody));
  const [stats, setStats] = useState(
    aboutPage?.stats && aboutPage.stats.length > 0
      ? aboutPage.stats
      : [
          { label: "Private cottage", value: "1" },
          { label: "Riverside location", value: "Potomac" },
          { label: "Locally hosted", value: "100%" },
          { label: "Guest support", value: "24/7" },
        ],
  );
  const [missionTitle, setMissionTitle] = useState(aboutPage?.missionTitle ?? "Our Mission");
  const [missionBodyText, setMissionBodyText] = useState(() => blocksToPlainText(aboutPage?.missionBody));
  const [missionImageUrl, setMissionImageUrl] = useState(aboutPage?.missionImageUrl ?? "");
  const [uploadingMissionImage, setUploadingMissionImage] = useState(false);

  async function handleMissionImageFile(file: File | undefined) {
    if (!file) return;
    if (!isImageUploadConfigured()) {
      setError(
        "Image uploads aren't configured yet — set NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME and NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET.",
      );
      return;
    }
    setError(null);
    setUploadingMissionImage(true);
    try {
      const result = await uploadAboutPageImage(file);
      setMissionImageUrl(result.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploadingMissionImage(false);
    }
  }
  const [valuesTitle, setValuesTitle] = useState(aboutPage?.valuesTitle ?? "What We Stand For");
  const [valuesSubtitle, setValuesSubtitle] = useState(
    aboutPage?.valuesSubtitle ??
      "Our values guide every detail of the cottage and every recommendation in our area guide.",
  );
  const [values, setValues] = useState(
    aboutPage?.values && aboutPage.values.length > 0
      ? aboutPage.values
      : [
          { title: "Trust & Safety", description: "The cottage is maintained and hosted directly by our team." },
          { title: "Local Experience", description: "We believe the best trips mean living like a local." },
          { title: "Fair Pricing", description: "Transparent pricing with no hidden fees." },
          { title: "Guest First", description: "Every detail is designed around your stay." },
        ],
  );
  const [ctaTitle, setCtaTitle] = useState(aboutPage?.ctaTitle ?? "Ready to plan your stay?");
  const [ctaSubtitle, setCtaSubtitle] = useState(
    aboutPage?.ctaSubtitle ??
      "Check availability for Potomac Vista Cottage, or explore the restaurants, parks, and waterfronts nearby.",
  );

  function updateStat(i: number, field: "label" | "value", value: string) {
    setStats((prev) => prev.map((s, idx) => (idx === i ? { ...s, [field]: value } : s)));
  }
  function updateValue(i: number, field: "title" | "description", value: string) {
    setValues((prev) => prev.map((v, idx) => (idx === i ? { ...v, [field]: value } : v)));
  }
  function removeStat(i: number) {
    setStats((prev) => prev.filter((_, idx) => idx !== i));
  }
  function removeValue(i: number) {
    setValues((prev) => prev.filter((_, idx) => idx !== i));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    const input: AboutPageFormInput = {
      heroTitle,
      heroSubtitle,
      heroBodyText,
      stats,
      missionTitle,
      missionBodyText,
      missionImageUrl,
      valuesTitle,
      valuesSubtitle,
      values,
      ctaTitle,
      ctaSubtitle,
    };
    startTransition(async () => {
      const result = await saveAboutPage(input);
      if (!result.success) {
        setError(result.error.message);
        return;
      }
      setSaved(true);
      router.refresh();
    });
  }

  const inputClass =
    "w-full px-3 py-2 text-sm border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100";
  const labelClass = "block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5";
  const sectionClass = "rounded-xl border border-neutral-200 dark:border-neutral-700 p-5 space-y-4";

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
      {error && (
        <div className="rounded-lg bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 text-sm px-4 py-3">
          {error}
        </div>
      )}
      {saved && (
        <div className="rounded-lg bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 text-sm px-4 py-3">
          Saved — the About page has been updated.
        </div>
      )}

      <div className={sectionClass}>
        <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">Hero</h3>
        <div>
          <label className={labelClass}>Title</label>
          <input className={inputClass} value={heroTitle} onChange={(e) => setHeroTitle(e.target.value)} />
        </div>
        <div>
          <label className={labelClass}>Subtitle</label>
          <input className={inputClass} value={heroSubtitle} onChange={(e) => setHeroSubtitle(e.target.value)} />
        </div>
        <div>
          <label className={labelClass}>Body (blank line = new paragraph)</label>
          <textarea
            className={inputClass}
            rows={5}
            value={heroBodyText}
            onChange={(e) => setHeroBodyText(e.target.value)}
          />
        </div>
      </div>

      <div className={sectionClass}>
        <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">Stats</h3>
        {stats.map((stat, i) => (
          <div key={i} className="flex gap-2 items-center">
            <input
              className={inputClass}
              placeholder="Label"
              value={stat.label}
              onChange={(e) => updateStat(i, "label", e.target.value)}
            />
            <input
              className={inputClass}
              placeholder="Value"
              value={stat.value}
              onChange={(e) => updateStat(i, "value", e.target.value)}
            />
            <button
              type="button"
              onClick={() => removeStat(i)}
              className="px-2 py-2 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
            >
              Remove
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => setStats((prev) => [...prev, { label: "", value: "" }])}
          className="text-sm text-primary-6000 hover:underline"
        >
          + Add stat
        </button>
      </div>

      <div className={sectionClass}>
        <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">Mission</h3>
        <div>
          <label className={labelClass}>Title</label>
          <input className={inputClass} value={missionTitle} onChange={(e) => setMissionTitle(e.target.value)} />
        </div>
        <div>
          <label className={labelClass}>Body (blank line = new paragraph)</label>
          <textarea
            className={inputClass}
            rows={5}
            value={missionBodyText}
            onChange={(e) => setMissionBodyText(e.target.value)}
          />
        </div>
        <div>
          <label className={labelClass}>Mission image</label>
          <div className="flex items-center gap-3">
            {missionImageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={missionImageUrl}
                alt=""
                className="w-16 h-12 rounded-lg object-cover flex-shrink-0 bg-neutral-100 dark:bg-neutral-700"
              />
            )}
            <label
              className={`px-3 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-600 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-700 ${
                uploadingMissionImage ? "opacity-50 pointer-events-none" : ""
              }`}
            >
              {uploadingMissionImage ? "Uploading..." : missionImageUrl ? "Replace photo" : "Upload photo"}
              <input
                type="file"
                accept="image/*"
                disabled={uploadingMissionImage}
                className="sr-only"
                onChange={(e) => handleMissionImageFile(e.target.files?.[0])}
              />
            </label>
          </div>
          <input
            className={`${inputClass} mt-2`}
            placeholder="or paste an image URL directly"
            value={missionImageUrl}
            onChange={(e) => setMissionImageUrl(e.target.value)}
          />
        </div>
      </div>

      <div className={sectionClass}>
        <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">Values</h3>
        <div>
          <label className={labelClass}>Section title</label>
          <input className={inputClass} value={valuesTitle} onChange={(e) => setValuesTitle(e.target.value)} />
        </div>
        <div>
          <label className={labelClass}>Section subtitle</label>
          <input
            className={inputClass}
            value={valuesSubtitle}
            onChange={(e) => setValuesSubtitle(e.target.value)}
          />
        </div>
        {values.map((value, i) => (
          <div key={i} className="rounded-lg border border-neutral-200 dark:border-neutral-700 p-3 space-y-2">
            <input
              className={inputClass}
              placeholder="Title"
              value={value.title}
              onChange={(e) => updateValue(i, "title", e.target.value)}
            />
            <textarea
              className={inputClass}
              rows={2}
              placeholder="Description"
              value={value.description}
              onChange={(e) => updateValue(i, "description", e.target.value)}
            />
            <button
              type="button"
              onClick={() => removeValue(i)}
              className="text-xs text-red-600 hover:underline"
            >
              Remove
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => setValues((prev) => [...prev, { title: "", description: "" }])}
          className="text-sm text-primary-6000 hover:underline"
        >
          + Add value
        </button>
      </div>

      <div className={sectionClass}>
        <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">Call to action</h3>
        <div>
          <label className={labelClass}>Title</label>
          <input className={inputClass} value={ctaTitle} onChange={(e) => setCtaTitle(e.target.value)} />
        </div>
        <div>
          <label className={labelClass}>Subtitle</label>
          <input className={inputClass} value={ctaSubtitle} onChange={(e) => setCtaSubtitle(e.target.value)} />
        </div>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="px-5 py-2.5 text-sm font-medium rounded-lg bg-primary-6000 text-white hover:bg-primary-700 disabled:opacity-50"
      >
        {isPending ? "Saving..." : "Save changes"}
      </button>
    </form>
  );
}
