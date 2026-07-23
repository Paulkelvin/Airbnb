import { InformationCircleIcon } from "@heroicons/react/24/outline";

/**
 * A standalone, always-visible disclosure — deliberately not folded into the
 * description paragraph or the collapsed FAQ accordion. A guest already
 * complained once about expecting water access this listing doesn't have, so
 * this needs to be seen before booking, not found by someone who happens to
 * expand the right FAQ question.
 */
export default function WaterAccessNotice() {
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/30 p-4 sm:p-5 flex gap-3">
      <InformationCircleIcon className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
      <div className="text-sm text-amber-900 dark:text-amber-200 space-y-2">
        <p className="font-semibold">A note on water access</p>
        <p>
          Potomac Vista Cottage does not have direct water access, a private beach, dock, or
          pier on the property. If getting out on the water is part of your trip, here&apos;s
          where our guests go:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Great Mills Canoe and Kayak Launch — 14 min drive</li>
          <li>St. Mary&apos;s River State Park — 12 min drive</li>
          <li>Point Lookout State Park — 34 min drive</li>
          <li>Leonardtown Wharf Park, kayak launch and pier — about 13 miles</li>
        </ul>
        <p>Bring your own kayak, paddleboard, or gear — there&apos;s nowhere on the property to launch from, but plenty close by.</p>
      </div>
    </div>
  );
}
