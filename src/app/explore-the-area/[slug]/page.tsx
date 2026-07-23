import { notFound } from "next/navigation";
import Link from "next/link";
import { MapPinIcon, ClockIcon, GlobeAltIcon } from "@heroicons/react/24/outline";
import BgGlassmorphism from "@/components/BgGlassmorphism";
import ButtonPrimary from "@/components/ui/ButtonPrimary";
import LocalExperienceCard from "@/components/LocalExperienceCard";
import LocalExperienceGallery from "@/components/LocalExperienceGallery";
import ExploreAreaMap from "@/components/ExploreAreaMap/ExploreAreaMap";
import { getExperienceBySlug, getAllExperiences } from "@/lib/local-experiences";
import { getPrimaryListing } from "@/modules/listings/queries";
import { fuzzCoordinates } from "@/lib/geo-fuzz";
import { CATEGORY_EMOJI } from "@/data/local-experiences";
import type { Route } from "@/routers/types";

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const experience = await getExperienceBySlug(params.slug);
  return { title: experience ? experience.title : "Not found" };
}

export default async function LocalExperiencePage({ params }: { params: { slug: string } }) {
  const [experience, allExperiences, primaryListing] = await Promise.all([
    getExperienceBySlug(params.slug),
    getAllExperiences(),
    getPrimaryListing(),
  ]);

  if (!experience) {
    notFound();
  }

  const gallery = [experience.imageUrl, ...experience.galleryImageUrls].filter(Boolean);
  const related = allExperiences.filter((e) => e.slug !== experience.slug).slice(0, 3);

  const hasCottageCoords = primaryListing?.latitude != null && primaryListing?.longitude != null;
  // No origin param — Google Maps fills that in with the visitor's current
  // location (via device GPS on mobile, or prompts for it on desktop).
  // Most visitors are viewing this page while still planning the trip, not
  // standing at the cottage, so directions "from the cottage" would send
  // the wrong people the wrong way.
  const directionsHref =
    experience.latitude != null && experience.longitude != null
      ? `https://www.google.com/maps/dir/?api=1&destination=${experience.latitude},${experience.longitude}`
      : null;

  return (
    <div className="nc-LocalExperiencePage overflow-hidden relative">
      <BgGlassmorphism />
      <div className="container relative py-16 lg:py-24">
        {primaryListing && (
          // Fixed rather than in-flow: the page is long (gallery, description,
          // map, related places below), and the whole point of this button is
          // that a guest who clicked here from the booking flow can get back
          // to it without scrolling up, so it needs to stay on screen the
          // entire time, not just near the top of the content. Wrapped in its
          // own positioned div rather than passing `fixed` straight into
          // ButtonPrimary's className — Button's own base classes already
          // include `relative`, and Tailwind's cascade order (not JSX order)
          // decides which position utility wins, so stacking them on the same
          // element is unreliable.
          <div className="fixed top-4 right-4 sm:top-6 sm:right-6 z-40">
            <ButtonPrimary
              href={`/listing-stay-detail/${primaryListing.slug}` as Route}
              sizeClass="px-4 py-2"
              fontSize="text-sm"
              className="shadow-lg"
            >
              Continue booking →
            </ButtonPrimary>
          </div>
        )}
        <div className="max-w-3xl">
          <Link
            href={"/explore-the-area" as Route}
            className="text-sm font-medium text-primary-6000 hover:text-primary-700"
          >
            ← Explore the Area
          </Link>
          <h1 className="mt-3 text-3xl md:text-4xl font-semibold">{experience.title}</h1>
          <p className="mt-3 text-lg text-neutral-600 dark:text-neutral-300">{experience.tagline}</p>
          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-neutral-500 dark:text-neutral-400">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800">
              {CATEGORY_EMOJI[experience.category] ?? ""} {experience.category}
            </span>
            <span className="inline-flex items-center gap-1">
              <MapPinIcon className="w-4 h-4" />
              {experience.distanceLabel} from Potomac Vista Cottage
            </span>
            {experience.openingHours && (
              <span className="inline-flex items-center gap-1">
                <ClockIcon className="w-4 h-4" />
                {experience.openingHours}
              </span>
            )}
          </div>
        </div>

        {/* GALLERY */}
        <LocalExperienceGallery images={gallery} title={experience.title} />

        <div className="mt-12 max-w-3xl space-y-8">
          <div>
            <h2 className="text-xl font-semibold mb-3">Why guests love it</h2>
            <p className="text-neutral-600 dark:text-neutral-300 leading-relaxed">
              {experience.description}
            </p>
          </div>

          {experience.websiteUrl && (
            <a
              href={experience.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-6000 hover:text-primary-700"
            >
              <GlobeAltIcon className="w-4 h-4" />
              Visit website
            </a>
          )}
        </div>

        {/* GETTING THERE — full-width, before "You might also like" */}
        <div className="mt-16">
          <h2 className="text-xl font-semibold mb-3">Getting there</h2>
          <p className="text-neutral-500 dark:text-neutral-400 text-sm mb-4">
            {experience.distanceLabel} from Potomac Vista Cottage
          </p>
          {experience.latitude != null && experience.longitude != null ? (
            <ExploreAreaMap
              className="aspect-[16/9] sm:aspect-[21/9]"
              cottage={
                hasCottageCoords
                  ? {
                      // Fuzzed for this map marker only — directionsHref
                      // above uses the precise destination coordinates
                      // regardless, since turn-by-turn directions must
                      // stay accurate.
                      ...fuzzCoordinates(primaryListing!.latitude!, primaryListing!.longitude!, primaryListing!.slug),
                      label: "Potomac Vista Cottage",
                    }
                  : { lat: experience.latitude, lng: experience.longitude, label: "Potomac Vista Cottage" }
              }
              experiences={[experience]}
            />
          ) : (
            <div className="aspect-[16/9] sm:aspect-[21/9] rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-500 dark:text-neutral-400 text-sm">
              Map not available
            </div>
          )}
          {directionsHref && (
            <a
              href={directionsHref}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-block text-center px-5 py-2.5 rounded-full border border-neutral-200 dark:border-neutral-700 text-sm font-medium hover:border-neutral-400 dark:hover:border-neutral-500 transition-colors"
            >
              Get Directions
            </a>
          )}
        </div>

        {related.length > 0 && (
          <div className="mt-16">
            <h2 className="text-xl font-semibold mb-6">You might also like</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {related.map((r) => (
                <LocalExperienceCard key={r.id} data={r} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
