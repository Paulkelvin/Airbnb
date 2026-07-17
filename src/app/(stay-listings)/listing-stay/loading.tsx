export default function Loading() {
  return (
    <div className="container py-16">
      <div className="h-8 w-48 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse mb-8" />
      <div className="grid grid-cols-1 gap-6 md:gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="rounded-2xl overflow-hidden">
            <div className="aspect-[4/3] bg-neutral-200 dark:bg-neutral-700 animate-pulse" />
            <div className="p-3 space-y-2">
              <div className="h-4 w-3/4 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
              <div className="h-3 w-1/2 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
              <div className="h-4 w-1/3 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
