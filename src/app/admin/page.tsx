import { getAdminStats } from "@/modules/admin/queries";

export const metadata = { title: "Admin Dashboard" };

export default async function AdminOverviewPage() {
  const stats = await getAdminStats();

  const cards = [
    { label: "Active Users", value: stats.userCount },
    { label: "Published Listings", value: stats.listingCount },
    { label: "Total Bookings", value: stats.bookingCount },
    { label: "Pending Moderation", value: stats.pendingModerationCount, alert: stats.pendingModerationCount > 0 },
    { label: "Disputed Bookings", value: stats.disputedCount, alert: stats.disputedCount > 0 },
    { label: "Total Revenue", value: `$${(stats.totalRevenueCents / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}` },
  ];

  return (
    <div>
      <h2 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100 mb-6">
        Platform Overview
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className={`rounded-xl border p-6 ${
              card.alert
                ? "border-yellow-300 bg-yellow-50 dark:border-yellow-600 dark:bg-yellow-900/20"
                : "border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-800"
            }`}
          >
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              {card.label}
            </p>
            <p className="mt-1 text-3xl font-semibold text-neutral-900 dark:text-neutral-100">
              {card.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
