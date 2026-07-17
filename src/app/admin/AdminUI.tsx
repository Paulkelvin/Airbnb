import Link from "next/link";

type BadgeTone = "green" | "yellow" | "red" | "blue" | "purple" | "gray";

const TONE_CLASSES: Record<BadgeTone, string> = {
  green: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  yellow: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  red: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  blue: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  purple: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  gray: "bg-neutral-100 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300",
};

export function AdminBadge({ tone, children }: { tone: BadgeTone; children: React.ReactNode }) {
  return (
    <span
      className={`px-2 py-0.5 text-xs rounded-full font-medium whitespace-nowrap ${TONE_CLASSES[tone]}`}
    >
      {children}
    </span>
  );
}

export function listingStatusTone(status: string): BadgeTone {
  if (status === "PUBLISHED") return "green";
  if (status === "PENDING_REVIEW") return "yellow";
  if (status === "REJECTED") return "red";
  return "gray";
}

export function bookingStatusTone(status: string): BadgeTone {
  if (status === "DISPUTED") return "red";
  if (status === "COMPLETED") return "green";
  if (status === "CONFIRMED" || status === "ACTIVE") return "blue";
  return "gray";
}

export function userStatusTone(status: string): BadgeTone {
  if (status === "ACTIVE") return "green";
  if (status === "SUSPENDED") return "red";
  return "gray";
}

export function AdminPageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
      <div>
        <h2 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">{title}</h2>
        {description && (
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{description}</p>
        )}
      </div>
      {actions && <div className="flex-shrink-0">{actions}</div>}
    </div>
  );
}

export function AdminFilterPills({
  options,
  activeValue,
  basePath,
  paramName = "status",
  formatLabel = (value: string) => value,
}: {
  options: readonly string[];
  activeValue: string;
  basePath: string;
  paramName?: string;
  formatLabel?: (value: string) => string;
}) {
  return (
    <div className="flex gap-2 mb-4 flex-wrap">
      {options.map((opt) => {
        const isActive = activeValue === opt;
        const href = opt === "ALL" ? basePath : `${basePath}?${paramName}=${opt}`;
        return (
          <Link
            key={opt}
            href={href as never}
            className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
              isActive
                ? "bg-primary-6000 text-white border-primary-6000"
                : "border-neutral-300 dark:border-neutral-600 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700"
            }`}
          >
            {formatLabel(opt)}
          </Link>
        );
      })}
    </div>
  );
}

export function AdminPagination({
  page,
  totalPages,
  basePath,
  extraParams = "",
}: {
  page: number;
  totalPages: number;
  basePath: string;
  extraParams?: string;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex justify-center gap-2 mt-4">
      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
        <Link
          key={p}
          href={`${basePath}?page=${p}${extraParams}` as never}
          className={`px-3 py-1 text-sm rounded ${
            p === page
              ? "bg-primary-6000 text-white"
              : "bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300"
          }`}
        >
          {p}
        </Link>
      ))}
    </div>
  );
}

export function AdminTableCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800">
      {children}
    </div>
  );
}
