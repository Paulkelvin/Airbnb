import Link from "next/link";
import {
  UsersIcon,
  HomeModernIcon,
  CalendarDaysIcon,
  BanknotesIcon,
  ClipboardDocumentCheckIcon,
  ExclamationTriangleIcon,
  ArrowRightIcon,
} from "@heroicons/react/24/outline";
import { getAdminStats } from "@/modules/admin/queries";

export const metadata = { title: "Admin Dashboard" };

export default async function AdminOverviewPage() {
  const stats = await getAdminStats();

  const metrics = [
    { label: "Active Users", value: stats.userCount, icon: UsersIcon, href: "/admin/users" },
    { label: "Published Listings", value: stats.listingCount, icon: HomeModernIcon, href: "/admin/listings" },
    { label: "Total Bookings", value: stats.bookingCount, icon: CalendarDaysIcon, href: "/admin/bookings" },
    {
      label: "Total Revenue",
      value: `$${(stats.totalRevenueCents / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
      icon: BanknotesIcon,
      href: "/admin/bookings",
    },
  ];

  const attentionItems = [
    {
      label: "Pending Moderation",
      value: stats.pendingModerationCount,
      icon: ClipboardDocumentCheckIcon,
      href: "/admin/listings?status=PENDING_REVIEW",
      description: "Listings waiting on approval before they go live.",
    },
    {
      label: "Disputed Bookings",
      value: stats.disputedCount,
      icon: ExclamationTriangleIcon,
      href: "/admin/bookings?status=DISPUTED",
      description: "Bookings flagged for a dispute that need resolving.",
    },
  ];

  const quickLinks = [
    { label: "Review pending listings", href: "/admin/listings?status=PENDING_REVIEW" },
    { label: "Manage property types & amenities", href: "/admin/taxonomy" },
    { label: "Adjust service fee & moderation", href: "/admin/settings" },
    { label: "View privileged action history", href: "/admin/audit-log" },
  ];

  return (
    <div className="space-y-10">
      <div>
        <h2 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
          Platform Overview
        </h2>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          A snapshot of Potomac's activity right now.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((card) => (
          <Link
            key={card.label}
            href={card.href as never}
            className="group rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-6 hover:border-primary-300 dark:hover:border-primary-700 hover:shadow-md transition-all"
          >
            <div className="w-10 h-10 rounded-lg bg-primary-50 dark:bg-primary-900/30 text-primary-6000 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <card.icon className="w-5 h-5" />
            </div>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">{card.label}</p>
            <p className="mt-1 text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
              {card.value}
            </p>
          </Link>
        ))}
      </div>

      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400 mb-3">
          Needs attention
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {attentionItems.map((item) => (
            <Link
              key={item.label}
              href={item.href as never}
              className={`group flex items-start gap-4 rounded-xl border p-5 transition-all hover:shadow-md ${
                item.value > 0
                  ? "border-yellow-300 bg-yellow-50 dark:border-yellow-600 dark:bg-yellow-900/20"
                  : "border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800"
              }`}
            >
              <div
                className={`w-10 h-10 flex-shrink-0 rounded-lg flex items-center justify-center ${
                  item.value > 0
                    ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400"
                    : "bg-neutral-100 text-neutral-500 dark:bg-neutral-700 dark:text-neutral-400"
                }`}
              >
                <item.icon className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-neutral-900 dark:text-neutral-100">
                    {item.label}
                  </p>
                  <span className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
                    {item.value}
                  </span>
                </div>
                <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                  {item.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400 mb-3">
          Quick links
        </h3>
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 divide-y divide-neutral-100 dark:divide-neutral-700">
          {quickLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href as never}
              className="flex items-center justify-between px-5 py-4 text-sm font-medium text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-700/50 transition-colors first:rounded-t-xl last:rounded-b-xl"
            >
              {link.label}
              <ArrowRightIcon className="w-4 h-4 text-neutral-400" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
