export default function Loading() {
  return (
    <div className="container py-10 lg:py-14 space-y-8">
      {/* Title */}
      <div className="space-y-3">
        <div className="h-8 w-2/3 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
        <div className="h-4 w-1/3 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
      </div>
      {/* Image grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 rounded-2xl overflow-hidden">
        <div className="col-span-2 row-span-2 aspect-[4/3] bg-neutral-200 dark:bg-neutral-700 animate-pulse" />
        <div className="aspect-square bg-neutral-200 dark:bg-neutral-700 animate-pulse" />
        <div className="aspect-square bg-neutral-200 dark:bg-neutral-700 animate-pulse" />
        <div className="aspect-square bg-neutral-200 dark:bg-neutral-700 animate-pulse hidden sm:block" />
        <div className="aspect-square bg-neutral-200 dark:bg-neutral-700 animate-pulse hidden sm:block" />
      </div>
      {/* Content + sidebar */}
      <div className="flex flex-col lg:flex-row gap-10">
        <div className="flex-1 space-y-4">
          <div className="h-5 w-full bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
          <div className="h-5 w-5/6 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
          <div className="h-5 w-4/6 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
          <div className="h-5 w-full bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
        </div>
        <div className="w-full lg:w-[380px] flex-shrink-0">
          <div className="h-64 bg-neutral-200 dark:bg-neutral-700 rounded-2xl animate-pulse" />
        </div>
      </div>
    </div>
  );
}
