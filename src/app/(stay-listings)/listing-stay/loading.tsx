export default function ListingStayLoading() {
  return (
    <div className="container pb-24 lg:pb-28">
      <div className="h-10 w-64 rounded-xl bg-neutral-200/70 dark:bg-neutral-800 animate-pulse mb-8" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, idx) => (
          <div
            key={idx}
            className="h-72 rounded-2xl bg-neutral-200/70 dark:bg-neutral-800 animate-pulse"
          />
        ))}
      </div>
    </div>
  );
}
