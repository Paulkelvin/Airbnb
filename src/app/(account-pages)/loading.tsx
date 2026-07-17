export default function Loading() {
  return (
    <div className="container pt-14 sm:pt-20 pb-24 lg:pb-32 space-y-6">
      <div className="h-8 w-48 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
      <div className="w-14 border-b border-neutral-200 dark:border-neutral-700" />
      <div className="space-y-4 max-w-2xl">
        <div className="h-4 w-full bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
        <div className="h-4 w-5/6 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
        <div className="h-4 w-2/3 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
      </div>
    </div>
  );
}
